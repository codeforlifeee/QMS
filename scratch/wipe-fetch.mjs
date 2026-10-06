const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function wipeOnly() {
  console.log('🗑️ Wiping all leads from Supabase using REST API...');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/leads?id=not.is.null`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  });

  if (!response.ok) {
    console.error('❌ Error wiping leads:', await response.text());
    return;
  }
  
  console.log('✅ Supabase leads wiped completely clean! The database is now empty.');
}

wipeOnly();
