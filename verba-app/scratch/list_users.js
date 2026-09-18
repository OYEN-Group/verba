const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const raw = fs.readFileSync('.env.local', 'utf8');
raw.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
client.auth.admin.listUsers().then(res => {
  console.log('Total users:', res.data.users.length);
  console.log(res.data.users.map(u => u.email).slice(0, 10)); // just print first 10
});
