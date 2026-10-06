import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

import { syncFromSheet } from '../src/lib/sheetSync';

async function wipeAndSync() {
  console.log('🗑️ Step 1: Wiping all leads from Supabase...');
  
  // Supabase requires a filter to delete multiple rows, so we say "delete where ID is not null" (which is everything)
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .not('id', 'is', null);

  if (deleteError) {
    console.error('❌ Error wiping leads:', deleteError);
    return;
  }
  console.log('✅ Supabase leads wiped completely clean!');

  console.log('🔄 Step 2: Fetching all data fresh from Google Sheets...');
  try {
    const result = await syncFromSheet();
    console.log(`🎉 Successfully imported ${result.imported} leads from Google Sheets!`);
    if (result.errors.length > 0) {
      console.log(`⚠️ Warning: Had ${result.errors.length} errors on specific rows:`, result.errors.slice(0, 5));
    }
  } catch (syncError) {
    console.error('❌ Error syncing leads:', syncError);
  }
}

wipeAndSync();
