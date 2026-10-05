#!/usr/bin/env npx tsx
/**
 * One-time migration: reads every JSON quotation from data/quotations/ and
 * upserts it into the Supabase `quotations` table.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/migrate-json-to-supabase.ts
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DATA_DIR = path.resolve(process.cwd(), 'data', 'quotations');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

async function run() {
  const files = (await readdir(DATA_DIR)).filter(
    (f) => f.endsWith('.json') && !f.includes('.citations.') && !f.includes('.chat.'),
  );

  console.log(`Found ${files.length} quotation(s) to migrate.`);
  let ok = 0;

  for (const file of files) {
    const raw = await readFile(path.join(DATA_DIR, file), 'utf8');
    const q = JSON.parse(raw);

    const { error } = await sb.from('quotations').upsert(
      {
        id: q.id,
        token: q.token,
        status: q.status,
        reference: q.reference,
        data: q,
        created_at: q.createdAt,
        updated_at: q.updatedAt,
      },
      { onConflict: 'id' },
    );

    if (error) {
      console.error(`  FAIL ${file}: ${error.message}`);
      continue;
    }

    // Migrate citations if present
    const citFile = file.replace('.json', '.citations.json');
    try {
      const citRaw = await readFile(path.join(DATA_DIR, citFile), 'utf8');
      await sb.from('citations').upsert(
        { quotation_id: q.id, data: JSON.parse(citRaw) },
        { onConflict: 'quotation_id' },
      );
    } catch {}

    // Migrate chat if present
    const chatFile = file.replace('.json', '.chat.json');
    try {
      const chatRaw = await readFile(path.join(DATA_DIR, chatFile), 'utf8');
      await sb.from('chat_sessions').upsert(
        { quotation_id: q.id, data: JSON.parse(chatRaw) },
        { onConflict: 'quotation_id' },
      );
    } catch {}

    ok++;
    console.log(`  OK ${file}`);
  }

  console.log(`\nMigrated ${ok}/${files.length} quotations.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
