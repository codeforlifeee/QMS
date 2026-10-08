const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
let apiKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('GOOGLE_SHEETS_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
});
const url = `https://sheets.googleapis.com/v4/spreadsheets/1niYNMdUZsWGnH2BxsnmG8DtKUfI3gecWNKp4jkOGmPA/values/Custom%2BDeals?key=${apiKey}`;
fetch(url).then(r=>r.json()).then(json=>{
  const rows = json.values;
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  console.log('Headers:', headers);
  const row = rows[1];
  const obj = {};
  headers.forEach((h, idx) => { obj[h] = (row[idx] || '').trim(); });
  console.log('First mapped row:', obj);
}).catch(console.error);
