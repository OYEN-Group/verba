import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env vars
if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      value = value.replace(/(^['"]|['"]$)/g, '').trim();
      process.env[key] = value;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
const USER_EMAIL = 'testa@verba.test';
const USER_PASSWORD = 'password123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function authUser(email: string) {
  let { data: auth, error } = await supabase.auth.signInWithPassword({ email, password: USER_PASSWORD });
  if (error) {
    const { error: signUpErr } = await supabase.auth.signUp({ email, password: USER_PASSWORD });
    const retry = await supabase.auth.signInWithPassword({ email, password: USER_PASSWORD });
    if (!retry.data.session) throw new Error(`Could not auth ${email}. Signup err: ${signUpErr?.message}`);
    auth = retry.data;
  }
  return { user: auth.user!, token: auth.session!.access_token };
}

async function run() {
  console.log(`[Diagnostic] Supabase URL: ${SUPABASE_URL}`);
  
  const user = await authUser(USER_EMAIL);
  console.log(`[Diagnostic] Authenticated as ${user.user.id}`);
  
  const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${user.token}` } } });

  // 1. Direct RPC Test
  console.log(`\n--- Direct RPC Test ---`);
  const rpcRes = await sbAuth.rpc('consume_rate_limit', {
    p_action: 'diagnostic_source',
    p_limit: 20,
    p_window_seconds: 60
  });
  console.log(`RPC Result:`, JSON.stringify(rpcRes, null, 2));

  // 2. Query buckets
  console.log(`\n--- Rate Limit Buckets ---`);
  const { data: buckets, error: bErr } = await sbAuth.from('rate_limit_buckets').select('*');
  console.log(`Buckets Error:`, bErr);
  console.log(`Buckets:`, JSON.stringify(buckets, null, 2));
  
  // 3. Setup test work
  console.log(`\n--- Setting up Work ---`);
  const { data: work, error: workErr } = await sbAuth.from('works').insert({ title: 'Diagnostic Work', user_id: user.user.id }).select('id').single();
  if (workErr && workErr.code !== '23505') console.error(`Work Error:`, workErr);
  
  const workId = work?.id || (await sbAuth.from('works').select('id').limit(1).single()).data?.id;
  console.log(`Work ID: ${workId}`);

  // 4. API Request using fetch to local next.js server
  console.log(`\n--- API Request ---`);
  const API_BASE = 'http://localhost:3000/api';
  try {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/works/${workId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ 
        source_type: 'book', 
        title: `Diagnostic Book ${Date.now()}`, 
        publication_year: 2026 
      })
    });
    console.log(`API Status: ${res.status} (${Date.now() - start}ms)`);
    const bodyText = await res.text();
    console.log(`API Body:`, bodyText);
  } catch(e: any) {
    console.log(`API Fetch Error:`, e.message);
  }
}

run().catch(console.error);
