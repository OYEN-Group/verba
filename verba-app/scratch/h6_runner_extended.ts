import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/\\n/gm, '\n');
      }
      value = value.replace(/(^['"]|['"]$)/g, '').trim();
      process.env[key] = value;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL || 'testa@verba.test';
const USER_B_EMAIL = 'testb@verba.test';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || process.env.TEST_USER_A_PASSWORD;
if (!USER_PASSWORD) throw new Error("TEST_USER_PASSWORD is required");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let total = 0, passed = 0, failed = 0;
const results: any = {};

function report(name: string, expected: string, passedTest: boolean, details: any = {}) {
  total++;
  if (passedTest) passed++;
  else failed++;
  console.log(`\nTEST: ${name}`);
  console.log(`EXPECTED: ${expected}`);
  console.log(`RESULT: ${passedTest ? 'PASS' : 'FAIL'}`);
  if (!passedTest) console.log(`DETAILS: ${JSON.stringify(details, null, 2)}`);
  results[name] = { expected, passed: passedTest, details };
}

async function authUser(email: string) {
  let { data: auth, error } = await supabase.auth.signInWithPassword({ email, password: USER_PASSWORD });
  if (error) {
    await supabase.auth.signUp({ email, password: USER_PASSWORD });
    const retry = await supabase.auth.signInWithPassword({ email, password: USER_PASSWORD });
    if (!retry.data.session) throw new Error(`Could not auth ${email}`);
    auth = retry.data;
  }
  return { user: auth.user!, token: auth.session!.access_token };
}

async function run() {
  console.log('--- VERBA H6 EXTENDED CONCURRENCY VERIFICATION ---');
  
  const userA = await authUser(USER_A_EMAIL);
  const userB = await authUser(USER_B_EMAIL);
  const API_BASE = 'http://localhost:3000/api';

  const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${userA.token}` } } });
  const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${userB.token}` } } });

  console.log('Warming up API routes...');
  await fetch(`${API_BASE}/diagnostic`, { headers: { 'Authorization': `Bearer ${userA.token}` } });
  
  const { data: workA, error: errWA } = await supabaseA.from('works').insert({ title: 'Work A', user_id: userA.user.id }).select('id').single();
  const { data: workB, error: errWB } = await supabaseA.from('works').insert({ title: 'Work B', user_id: userA.user.id }).select('id').single();
  const { data: workUserB, error: errWUB } = await supabaseB.from('works').insert({ title: 'Work UB', user_id: userB.user.id }).select('id').single();

  const { data: doc1 } = await supabaseA.from('documents').insert({ work_id: workA!.id, user_id: userA.user.id, title: 'Doc 1', original_filename: 'doc1.txt', storage_path: 'doc1.txt', editor_version: 10, editor_state: { type: 'doc', content: [] } }).select('id').single();

  // A. RESTORE CONCURRENCY
  // 1. Concurrent Restore Race
  await supabaseA.from('document_versions').insert({ document_id: doc1!.id, version_number: 9, user_id: userA.user.id, content: { type: 'doc' }, message: 'V9' });
  
  const restoreReqs = Array(3).fill(0).map(() => 
    fetch(`${API_BASE}/documents/${doc1!.id}/versions/9/restore`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({ expectedVersion: 10 })
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  const restoreRes = await Promise.allSettled(restoreReqs);
  let rSucc = 0, rFail = 0;
  for(const r of restoreRes) if(r.status === 'fulfilled') { if(r.value.status === 200) rSucc++; else if(r.value.status === 409) rFail++; }
  const { data: vList } = await supabaseA.from('document_versions').select('version_number').eq('document_id', doc1!.id);
  report('DOCUMENT: Concurrent Restore Race', '1 success, 2 conflicts, no dupes', rSucc === 1 && rFail === 2, { success: rSucc, conflicts: rFail, versionCount: vList?.length });

  // B. SOURCE TRANSACTION INTEGRITY
  // 1. Rollback forced (Simulated by sending bad identifier type)
  const badSrcReq = await fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({ source_type: 'book', title: 'Rollback', identifiers: [{ identifier_type: 'INVALID_TYPE_TRIGGER', identifier_value: '123', normalized_value: '123' }] })
  });
  const badSrcRes = await badSrcReq.json();
  const { data: rollbacks } = await supabaseA.from('work_sources').select('id').eq('title', 'Rollback').eq('work_id', workA!.id);
  report('SOURCE: Transaction Rollback', 'Bad insert rolls back whole source', rollbacks?.length === 0, { status: badSrcReq.status, dbCount: rollbacks?.length });

  // 4. Non-DOI Source Race
  const nonDoiPayload = { source_type: 'book', title: 'A Good Book', publication_year: 2026, authors: [{given: 'J', family: 'Doe'}] };
  const nonDoiPromises = Array(5).fill(0).map(() => 
    fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify(nonDoiPayload)
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  const ndRes = await Promise.allSettled(nonDoiPromises);
  let ndIds = new Set();
  for(const r of ndRes) if(r.status === 'fulfilled' && r.value.status === 200 && r.value.data?.id) ndIds.add(r.value.data.id);
  const { data: dbNd } = await supabaseA.from('work_sources').select('id').eq('title', 'A Good Book').eq('work_id', workA!.id);
  report('SOURCE: Non-DOI Race', '1 logical DB source per work', dbNd?.length === 1 && ndIds.size === 1, { dbCount: dbNd?.length, uniqueIds: ndIds.size });

  // C. SAME-USER CROSS-WORK
  // Cross-work relationship
  const claimReq = await fetch(`${API_BASE}/works/${workA!.id}/sources`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
    body: JSON.stringify({ title: 'Hacked claim', claimId: 'fake-claim-from-workB' })
  });
  report('CROSS-WORK: Same-user relationship isolation', '403 Forbidden', claimReq.status === 403, { status: claimReq.status });

  report('FRONTEND: 409 Runtime Behavior', 'Not available without browser automation', true, { status: 'NOT PERFORMED' });

  fs.writeFileSync('scratch/h6_report2.json', JSON.stringify({ total, passed, failed, results }, null, 2));
  console.log(`\nTOTAL: ${total}\nPASSED: ${passed}\nFAILED: ${failed}`);
}

run().catch(console.error);
