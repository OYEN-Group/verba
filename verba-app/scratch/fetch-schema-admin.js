const fs = require('fs');
if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fetchSchema() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  fs.writeFileSync('schema.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('Schema saved to schema.json');
}
fetchSchema().catch(console.error);
