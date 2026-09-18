import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

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
const TEST_USER_EMAIL = 'testa@verba.test';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!TEST_USER_PASSWORD) {
  console.error("ERROR: TEST_USER_PASSWORD is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Authenticating staging test user...");
  let { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ 
    email: TEST_USER_EMAIL, 
    password: TEST_USER_PASSWORD 
  });
  
  if (authErr || !auth.session) {
    console.error("Authentication failed:", authErr?.message);
    process.exit(1);
  }

  const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }
  });

  console.log("Creating disposable test work...");
  const { data: work, error: workErr } = await sbAuth.from('works')
    .insert({ title: `Load Test Work ${Date.now()}`, user_id: auth.user.id })
    .select('id, user_id').single();
    
  if (workErr || !work) {
    console.error("Failed to create work:", workErr?.message);
    process.exit(1);
  }

  console.log("Creating disposable test document...");
  const { data: doc, error: docErr } = await sbAuth.from('documents')
    .insert({ work_id: work.id, title: `Load Test Doc ${Date.now()}`, user_id: auth.user.id, original_filename: 'load_test.pdf', storage_path: 'test/load_test.pdf' })
    .select('id, work_id').single();
    
  if (docErr || !doc) {
    console.error("Failed to create document:", docErr?.message);
    process.exit(1);
  }

  const STAGING_API_BASE = 'http://localhost:3000/api';
  const IS_PROD = STAGING_API_BASE.includes('app.verba.com') || STAGING_API_BASE.includes('production');
  
  console.log(`\n======================================`);
  console.log(`SAFE PREFLIGHT REPORT`);
  console.log(`======================================`);
  console.log(`Environment: staging`);
  console.log(`Verba API host: ${STAGING_API_BASE}`);
  console.log(`Supabase project: poaclxtaacguolfeefcd`);
  console.log(`Test user: ${auth.user.id}`);
  console.log(`Authenticated: YES`);
  console.log(`Access token present: YES`);
  console.log(`Work ID: ${work.id}`);
  console.log(`Document ID: ${doc.id}`);
  console.log(`Work ownership verified: ${work.user_id === auth.user.id ? 'YES' : 'NO'}`);
  console.log(`Document/work relationship verified: ${doc.work_id === work.id ? 'YES' : 'NO'}`);
  console.log(`Production target: ${IS_PROD ? 'YES' : 'NO'}`);
  console.log(`======================================\n`);

  if (IS_PROD) {
    console.error("ABORT: Target appears to be production.");
    process.exit(1);
  }
  
  if (work.user_id !== auth.user.id || doc.work_id !== work.id) {
    console.error("ABORT: Ownership/relationship verification failed.");
    process.exit(1);
  }

  console.log("Starting load test harness...\n");
  
  const env = {
    ...process.env,
    ALLOW_STAGING_LOAD_TEST: 'true',
    STAGING_API_BASE,
    STAGING_ACCESS_TOKEN: auth.session.access_token,
    TEST_WORK_ID: work.id,
    TEST_DOCUMENT_ID: doc.id
  };

  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'scratch/load_test.ts'], { env, stdio: 'inherit', shell: true });

  child.on('close', async (code) => {
    console.log(`\nLoad test exited with code ${code}`);
    console.log("Cleaning up diagnostic data...");
    
    await sbAuth.from('documents').delete().eq('id', doc.id);
    await sbAuth.from('works').delete().eq('id', work.id);
    
    // Clean up synthetic sources from tests C and D
    // C used DOI: 10.5555/dedupe...
    // D used DOI: 10.5555/distinct...
    await sbAuth.from('work_sources').delete().like('doi', '10.5555/%');
    
    console.log("Cleanup complete.");
    process.exit(code ?? 0);
  });
}

run().catch(console.error);
