import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

async function run() {
  const raw = await readFile(path.resolve(process.cwd(), 'raw_leads.txt'), 'utf8');
  // split by newline, ignoring empty lines
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');

  const leads = [];

  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 15) continue; // skip malformed lines

    // Depending on the format, if id (l:xxxx) is at the beginning or end.
    // The diff shows:
    // l:1056718910692063	2026-09-19T01:49:24-05:00	ag:52550095375614 ...
    // Let's assume columns match the 21 fields header.
    // id, created_time, ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name, form_id, form_name, is_organic, platform, when_are_you_planning?, planning_with, number_of_adults_and_child_(below_9)?, any_special_arrangements(if_any)?, full_name, phone_number, email, city, lead_status

    const external_id = cols[0].replace('l:', '').trim();
    if (!external_id) continue;

    leads.push({
      external_id: external_id,
      date: cols[1],
      travelling_month: cols[12],
      planning_with: cols[13],
      pax_summary: cols[14],
      special_arrangements: cols[15],
      customer_name: cols[16] || 'Unknown',
      phone: (cols[17] || '').replace('p:', '').trim(),
      email: cols[18],
      city: cols[19],
      latest_status: cols[20] || 'CREATED',
      priority_bucket: 'Untouched Leads'
    });
  }

  console.log(`Parsed ${leads.length} leads. Inserting...`);
  
  const { error } = await sb.from('leads').upsert(leads, { onConflict: 'external_id' });
  if (error) {
    console.error('Failed to seed leads:', error);
  } else {
    console.log('Successfully seeded leads to Supabase!');
  }
}

run().catch(console.error);
