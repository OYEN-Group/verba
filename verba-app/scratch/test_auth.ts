import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log(`[Diagnostic] Supabase URL: ${SUPABASE_URL}`);
  console.log(`[Diagnostic] Anon Key length: ${SUPABASE_ANON_KEY.length}`);
  
  const email = 'testa@verba.test';
  const password = 'password123';
  
  console.log("Authenticating...");
  let { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.log("Sign in failed, attempting sign up...", authErr.message);
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
        console.error("Sign up failed:", signUpErr.message);
        return;
    }
    const retry = await supabase.auth.signInWithPassword({ email, password });
    auth = retry.data;
  }
  
  if (!auth.user) {
    console.error("Failed to obtain user session.");
    return;
  }
  
  console.log(`Authenticated as ${auth.user.id}`);
  
  const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth.session!.access_token}` } }
  });

  console.log(`\n--- Direct RPC Test ---`);
  const rpcRes = await sbAuth.rpc('consume_rate_limit', {
    p_action: 'diagnostic_source',
    p_limit: 20,
    p_window_seconds: 60
  });
  console.log(`RPC Result:`, JSON.stringify(rpcRes, null, 2));

  console.log(`\n--- Rate Limit Buckets ---`);
  const { data: buckets, error: bErr } = await sbAuth.from('rate_limit_buckets').select('*');
  console.log(`Buckets Error:`, bErr);
  console.log(`Buckets:`, JSON.stringify(buckets, null, 2));
}

run();
