const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
let apiKey = '';
env.split('\n').forEach(line => {
  if (line.startsWith('GOOGLE_SHEETS_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
});
const url = `https://sheets.googleapis.com/v4/spreadsheets/1niYNMdUZsWGnH2BxsnmG8DtKUfI3gecWNKp4jkOGmPA/values/Custom%2BDeals?key=${apiKey}`;
fetch(url).then(r=>r.json()).then(d=>console.log(d.values[0])).catch(console.error);
