import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeOnly() {
  console.log('🗑️ Wiping all leads from Supabase...');
  
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .not('id', 'is', null);

  if (deleteError) {
    console.error('❌ Error wiping leads:', deleteError);
    return;
  }
  console.log('✅ Supabase leads wiped completely clean! The database is now empty.');
}

wipeOnly();
