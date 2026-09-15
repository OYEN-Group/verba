import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = 'testa@verba.test';
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) throw new Error("TEST_USER_PASSWORD is required");
  let { data: auth } = await supabase.auth.signInWithPassword({ email, password });
  
  const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth.session!.access_token}` } }
  });

  const { data: buckets, error: bErr } = await sbAuth.from('rate_limit_buckets').select('*');
  console.log(`Buckets:`, JSON.stringify(buckets, null, 2));
}
run();
