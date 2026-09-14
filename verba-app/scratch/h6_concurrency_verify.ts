import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes
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
const USER_A_PASSWORD = process.env.TEST_USER_A_PASSWORD || 'password123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let total = 0;
let passed = 0;
let failed = 0;

function report(name: string, expected: string, passedTest: boolean, details: any = {}) {
  total++;
  if (passedTest) passed++;
  else failed++;

  console.log(`\nTEST: ${name}`);
  console.log(`EXPECTED: ${expected}`);
  console.log(`RESULT: ${passedTest ? 'PASS' : 'FAIL'}`);
  if (!passedTest) {
    console.log(`DETAILS: ${JSON.stringify(details, null, 2)}`);
  }
}

async function run() {
  console.log('--- VERBA H6 CONCURRENCY VERIFICATION ---');

  // Authenticate
  const { data: authA, error: errA } = await supabase.auth.signInWithPassword({ email: USER_A_EMAIL, password: USER_A_PASSWORD });
  if (errA) {
    console.log('Creating test user...');
    await supabase.auth.signUp({ email: USER_A_EMAIL, password: USER_A_PASSWORD });
    const { data: retryA } = await supabase.auth.signInWithPassword({ email: USER_A_EMAIL, password: USER_A_PASSWORD });
    if (!retryA.session) throw new Error('Could not auth User A');
    Object.assign(authA, retryA);
  }

  const userA = authA.user!;
  const token = authA.session!.access_token;
  const API_BASE = 'http://localhost:3000/api';

  // 1. Setup Fixture Document
  const { data: workA, error: errW } = await supabase.from('works').insert({ title: 'Work A', user_id: userA.id }).select('id').single();
  if (errW) throw new Error('Failed to create Work A: ' + errW.message);
  
  const { data: docA, error: errD } = await supabase.from('documents').insert({ work_id: workA!.id, user_id: userA.id, title: 'Doc A', original_filename: 'docA.txt', storage_path: 'workA/docA.txt', editor_version: 10, editor_state: { type: 'doc', content: [] } }).select('id').single();
  if (errD) throw new Error('Failed to create Doc A: ' + errD.message);

  // ---------------------------------------------------------
  // TEST 1 — DOCUMENT SAVE RACE
  // ---------------------------------------------------------
  const savePromises = Array(10).fill(0).map((_, i) => 
    fetch(`${API_BASE}/documents/${docA!.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        expectedVersion: 10, 
        editorState: { type: 'doc', content: [{ type: 'text', text: `SAVE_${i}` }] }
      })
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );

  const results = await Promise.allSettled(savePromises);
  
  let successCount = 0;
  let conflictCount = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.status === 200) successCount++;
      if (r.value.status === 409) conflictCount++;
    }
  }

  const { data: finalDoc } = await supabase.from('documents').select('editor_version, editor_state').eq('id', docA!.id).single();

  report(
    'TEST 1 - DOCUMENT SAVE RACE',
    '1 success, 9 conflicts, version=11',
    successCount === 1 && conflictCount === 9 && finalDoc?.editor_version === 11,
    { successCount, conflictCount, finalDoc }
  );

  // ---------------------------------------------------------
  // TEST 2 — DELAYED STALE AUTOSAVE (Test 31 equivalent)
  // ---------------------------------------------------------
  const { data: docB, error: errD2 } = await supabase.from('documents').insert({ work_id: workA!.id, user_id: userA.id, title: 'Doc B', original_filename: 'docB.txt', storage_path: 'workA/docB.txt', editor_version: 20, editor_state: { type: 'doc', content: [] } }).select('id').single();
  if (errD2) throw new Error('Failed to create Doc B: ' + errD2.message);

  const reqA = fetch(`${API_BASE}/documents/${docB!.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        expectedVersion: 20, 
        editorState: { type: 'doc', content: [{ type: 'text', text: 'OLD_AUTOSAVE' }] }
      })
  });

  // Small delay to ensure they are sent sequentially, but both expect version 20
  await new Promise(r => setTimeout(r, 50));

  const reqB = fetch(`${API_BASE}/documents/${docB!.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        expectedVersion: 20, 
        editorState: { type: 'doc', content: [{ type: 'text', text: 'NEW_MANUAL_SAVE' }] }
      })
  });

  const [resA, resB] = await Promise.all([
    reqA.then(res => res.json().then(data => ({ status: res.status, data }))),
    reqB.then(res => res.json().then(data => ({ status: res.status, data })))
  ]);

  const { data: finalDocB } = await supabase.from('documents').select('editor_version, editor_state').eq('id', docB!.id).single();
  const finalContent = finalDocB?.editor_state?.content?.[0]?.text;

  // Expected: Both sent expectedVersion 20. The one that wins gets 200, the other 409.
  // Wait, if reqA was sent first, reqA might win. The requirement is that one wins, one loses.
  report(
    'TEST 2 - DELAYED STALE AUTOSAVE',
    'One 200, one 409, final version 21',
    (resA.status === 200 && resB.status === 409 && finalContent === 'OLD_AUTOSAVE') ||
    (resA.status === 409 && resB.status === 200 && finalContent === 'NEW_MANUAL_SAVE'),
    { resA, resB, finalDocB }
  );

  // ---------------------------------------------------------
  // TEST 11 — CREATE SOURCE RACE — DOI
  // ---------------------------------------------------------
  const sourcePayload = {
    source_type: 'journal_article',
    title: 'Concurrent Source DOI Test',
    doi: '10.1234/test.race.' + Date.now(),
    publication_year: 2026,
    authors: [{ given: 'John', family: 'Smith' }]
  };

  const sourcePromises = Array(10).fill(0).map(() => 
    fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(sourcePayload)
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );

  const sourceResults = await Promise.allSettled(sourcePromises);
  
  let rpcSuccessCount = 0;
  let rpcConflictCount = 0;
  let returnedSourceIds = new Set();
  let rpcError = null;

  for (const r of sourceResults) {
    if (r.status === 'fulfilled') {
      if (r.value.status === 200 || r.value.status === 201) rpcSuccessCount++;
      if (r.value.status === 409) rpcConflictCount++;
      if (r.value.data?.error) rpcError = r.value.data.error;
      if (r.value.data?.id) returnedSourceIds.add(r.value.data.id);
    }
  }

  const { data: dbSources } = await supabase.from('work_sources').select('id').eq('doi', sourcePayload.doi);

  report(
    'TEST 11 - CREATE SOURCE RACE - DOI',
    'One logical work_source, all successful return same ID',
    dbSources?.length === 1 && returnedSourceIds.size === 1 && !rpcError,
    { rpcSuccessCount, rpcConflictCount, uniqueIds: returnedSourceIds.size, dbCount: dbSources?.length, rpcError }
  );

  console.log(`\nTOTAL: ${total}\nPASSED: ${passed}\nFAILED: ${failed}`);
}

run().catch(console.error);
