const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const raw = fs.readFileSync('.env.local', 'utf8');
raw.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
});
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const pool = JSON.parse(fs.readFileSync('scratch/h6-p4b-pool.json', 'utf8'));

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const u = pool.users[0];
  const cred = pool.credentials.find(c => c.index === u.index);
  const { data: authData } = await client.auth.signInWithPassword({ email: cred.email, password: cred.password });
  
  // 1. Fetch the sources
  const { data: sources } = await client.from('work_sources').select('id, work_id, user_id').in('id', u.sourceIds);
  console.log('Sources:', sources);
}
main().catch(console.error);
