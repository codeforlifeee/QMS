import { leadRepo } from '../data/leadRepo.js';
import { notificationRepo } from '../data/notificationRepo.js';
import { getSupabase } from '../data/supabase.js';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SHEET_ID = '1niYNMdUZsWGnH2BxsnmG8DtKUfI3gecWNKp4jkOGmPA';
const DEFAULT_TAB_NAME = 'Custom+Deals';

function getSheetConfig() {
  try {
    const configPath = path.resolve(process.cwd(), 'data', 'sheet_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.sheetId && config.tabName) {
        return { sheetId: config.sheetId, tabName: config.tabName };
      }
    }
  } catch (err) {
    console.error('Failed to read sheet config', err);
  }
  return { sheetId: DEFAULT_SHEET_ID, tabName: DEFAULT_TAB_NAME };
}

export async function syncFromSheet(source: string = 'webhook'): Promise<{ imported: number; errors: string[] }> {
  const { sheetId, tabName } = getSheetConfig();

  // @ts-ignore
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.GOOGLE_SHEETS_API_KEY) || process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_SHEETS_API_KEY not set');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const rows: string[][] = json.values ?? [];
  if (rows.length < 2) return { imported: 0, errors: [] };

  const headers = rows[0]!.map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const errors: string[] = [];
  let imported = 0;
  let newCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const obj: Record<string, string> = {};
    headers.forEach((h: string, idx: number) => {
      obj[h] = (row[idx] ?? '').trim();
    });

    if (!obj.customer_name && !obj.name && !obj.full_name) continue;

    try {
      const extId = obj.id || obj._rowid || `sheet_${i}`;
      const { data: existing } = await getSupabase().from('leads').select('id').eq('external_id', extId).maybeSingle();
      
      const lead = await leadRepo.upsertByExternalId({
        external_id: extId,
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
        ...(obj.created_time ? { created_at: new Date(obj.created_time).toISOString() } : {})
      });
      imported++;

      if (!existing) {
        newCount++;
        await notificationRepo.create({
          type: 'new_lead',
          title: 'New Lead: ' + lead.customer_name,
          message: `Arrived from Google Sheets (${lead.city || 'Unknown location'})`,
          link: `/leads/${lead.id}`
        });
      }
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  if (newCount > 0) {
    await notificationRepo.create({
      type: 'sync_complete',
      title: 'Sync Complete',
      message: `Imported ${newCount} new leads from Google Sheets.`,
    });
  }

  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'last_sync.json'), JSON.stringify({ time: new Date().toISOString(), source }));
  } catch (err) {
    console.error('Failed to save sync meta', err);
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
