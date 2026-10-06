import { leadRepo } from '../data/leadRepo.js';

const SHEET_ID = '1niYNMdUZsWGnH2BxsnmG8DtKUfI3gecWNKp4jkOGmPA';
const TAB_NAME = 'reel_43000';

export async function syncFromSheet(): Promise<{ imported: number; errors: string[] }> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_SHEETS_API_KEY not set');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const rows: string[][] = json.values ?? [];
  if (rows.length < 2) return { imported: 0, errors: [] };

  const headers = rows[0]!.map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const errors: string[] = [];
  let imported = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const obj: Record<string, string> = {};
    headers.forEach((h: string, idx: number) => {
      obj[h] = (row[idx] ?? '').trim();
    });

    if (!obj.customer_name && !obj.name && !obj.full_name) continue;

    try {
      await leadRepo.upsertByExternalId({
        external_id: obj.id || obj._rowid || `sheet_${i}`,
        customer_name: obj.customer_name || obj.name || obj.full_name || 'Unknown',
        phone: obj.phone || obj.mobile || obj.phone_number,
        email: obj.email,
        city: obj.city || obj.destination_city,
        travelling_month: obj.travelling_month || obj.travel_month || obj['when_are_you_planning?'],
        planning_with: obj.planning_with || obj['who_are_you_travell?'],
        pax_summary: obj.pax_summary || obj['number_of_adults_and_child_(below_9)?'],
        special_arrangements: obj.special_arrangements || obj.requirements || obj['any_special_arrangements(if_any)?'],
        priority_bucket: mapBucket(obj.priority_bucket || obj.lead_status) as any || 'Untouched Leads',
        latest_status: obj.latest_status || obj.lead_status,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { imported, errors };
}

function mapBucket(raw?: string): string {
  if (!raw) return 'Untouched Leads';
  const normalized = raw.trim();
  const buckets = [
    'Untouched Leads', 'Call Not Connected', 'In Progress',
    'My Hot', 'Warm Lead', 'Rejected',
  ];
  for (const b of buckets) {
    if (normalized.toLowerCase() === b.toLowerCase()) return b;
  }
  return 'Untouched Leads';
}
