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
const USER_PASSWORD = process.env.TEST_USER_A_PASSWORD || 'password123';

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

  // Warmup to prevent cold-start timeouts
  console.log('Warming up API routes...');
  await fetch(`${API_BASE}/diagnostic`, { headers: { 'Authorization': `Bearer ${userA.token}` } });
  
  // Setup Work
  const { data: workA, error: errWA } = await supabaseA.from('works').insert({ title: 'Work A', user_id: userA.user.id }).select('id').single();
  if (errWA) throw new Error('WA: ' + errWA.message);
  const { data: workB, error: errWB } = await supabaseB.from('works').insert({ title: 'Work B', user_id: userB.user.id }).select('id').single();
  if (errWB) throw new Error('WB: ' + errWB.message);

  // --- DOCUMENT CONCURRENCY ---
  // 1. Save Race
  const { data: doc1, error: errD1 } = await supabaseA.from('documents').insert({ work_id: workA!.id, user_id: userA.user.id, title: 'Doc 1', original_filename: 'doc1.txt', storage_path: 'doc1.txt', editor_version: 10, editor_state: { type: 'doc', content: [] } }).select('id').single();
  if (errD1) throw new Error('D1: ' + errD1.message);
  const savePromises = Array(10).fill(0).map((_, i) => 
    fetch(`${API_BASE}/documents/${doc1!.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({ expectedVersion: 10, editorState: { type: 'doc', content: [{ type: 'text', text: `SAVE_${i}` }] } })
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  const res1 = await Promise.allSettled(savePromises);
  let s1=0, c1=0;
  for(const r of res1) if (r.status === 'fulfilled') { if (r.value.status === 200) s1++; if (r.value.status === 409) c1++; }
  const { data: finalDoc1 } = await supabaseA.from('documents').select('editor_version').eq('id', doc1!.id).single();
  report('DOCUMENT: Save Race', '1 success, 9 conflicts, version 11', s1 === 1 && c1 === 9 && finalDoc1?.editor_version === 11, { s1, c1, finalDoc1 });

  // 2. Old-Content/New-Version Regression
  const { data: doc2 } = await supabaseA.from('documents').insert({ work_id: workA!.id, user_id: userA.user.id, title: 'Doc 2', original_filename: 'doc2.txt', storage_path: 'doc2.txt', editor_version: 70, editor_state: { type: 'doc', content: [] } }).select('id').single();
  const reqNew = fetch(`${API_BASE}/documents/${doc2!.id}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({ expectedVersion: 70, editorState: { type: 'doc', content: [{ type: 'text', text: 'NEW' }] } })
  });
  // Simulate delay
  await new Promise(r => setTimeout(r, 50));
  const reqOld = fetch(`${API_BASE}/documents/${doc2!.id}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({ expectedVersion: 70, editorState: { type: 'doc', content: [{ type: 'text', text: 'OLD' }] } })
  });
  
  const [resNewObj, resOldObj] = await Promise.all([
    reqNew.then(r => r.json().then(d => ({status: r.status, data: d}))),
    reqOld.then(r => r.json().then(d => ({status: r.status, data: d})))
  ]);

  const { data: finalDoc2 } = await supabaseA.from('documents').select('editor_version, editor_state').eq('id', doc2!.id).single();
  // We expect ONE to succeed and ONE to fail. The one that succeeds sets the content.
  const successCount = (resNewObj.status === 200 ? 1 : 0) + (resOldObj.status === 200 ? 1 : 0);
  const conflictCount = (resNewObj.status === 409 ? 1 : 0) + (resOldObj.status === 409 ? 1 : 0);
  
  report('DOCUMENT: Old-Content/New-Version Regression', 'One 200, one 409, DB 71', successCount === 1 && conflictCount === 1 && finalDoc2?.editor_version === 71, { resNewObj, resOldObj, finalDoc2 });

  // 3. Different Users Concurrently
  const reqCrossUser = await fetch(`${API_BASE}/documents/${doc2!.id}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userB.token}` },
      body: JSON.stringify({ expectedVersion: 71, editorState: { type: 'doc', content: [{ type: 'text', text: 'HACK' }] } })
  });
  report('DOCUMENT: Cross-User Concurrency', 'User B gets 404/401 on User A doc', reqCrossUser.status === 404 || reqCrossUser.status === 401, { status: reqCrossUser.status });

  // --- SOURCE CONCURRENCY ---
  // 4. DOI Race
  const doiPayload = { source_type: 'journal_article', title: 'DOI Race', doi: '10.5555/test.race.' + Date.now(), publication_year: 2026, authors: [] };
  const sourcePromises = Array(10).fill(0).map(() => 
    fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify(doiPayload)
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  const srcRes = await Promise.allSettled(sourcePromises);
  let srcIds = new Set();
  for(const r of srcRes) if (r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 201) && r.value.data?.id) srcIds.add(r.value.data.id);
  const { data: dbSources } = await supabaseA.from('work_sources').select('id').eq('doi', doiPayload.doi).eq('work_id', workA!.id);
  report('SOURCE: DOI Race', '1 logical DB source, all return same ID', dbSources?.length === 1 && srcIds.size === 1, { dbCount: dbSources?.length, uniqueReturnedIds: srcIds.size });

  // 5. ISBN Race (Duplicate Identifier Safety)
  const isbn = '978-3-16-148410-' + Date.now().toString().slice(-1);
  const isbnPayload = { source_type: 'book', title: 'ISBN Book', publication_year: 2026, authors: [], identifiers: [{ identifier_type: 'isbn', identifier_value: isbn, normalized_value: isbn, is_primary: true }] };
  const isbnPromises = Array(5).fill(0).map(() => 
    fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify(isbnPayload)
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  const isbnRes = await Promise.allSettled(isbnPromises);
  let isbnIds = new Set();
  for(const r of isbnRes) if (r.status === 'fulfilled' && r.value.data?.id) isbnIds.add(r.value.data.id);
  const { data: dbIsbns } = await supabaseA.from('work_sources').select('id').eq('title', 'ISBN Book').eq('work_id', workA!.id);
  report('SOURCE: ISBN Race', '1 logical DB source, unique ID', dbIsbns?.length === 1 && isbnIds.size === 1, { dbCount: dbIsbns?.length, uniqueReturnedIds: isbnIds.size });

  // 6. Cross-User Source RPC Auth
  const reqSourceCross = await fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userB.token}` },
      body: JSON.stringify({ source_type: 'book', title: 'Hacked Book' })
  });
  report('SOURCE: Cross-User RPC Auth', 'User B gets 403/404 on User A work', reqSourceCross.status === 404 || reqSourceCross.status === 403 || reqSourceCross.status === 401, { status: reqSourceCross.status });

  // --- CLAIM/EVIDENCE CONCURRENCY ---
  // 7. Concurrent Claim Evidence Upsert
  const { data: claimA } = await supabaseA.from('claims').insert({ work_id: workA!.id, user_id: userA.user.id, claim_text: 'Claim A', normalized_claim_text: 'claim a', content_hash: '123', document_id: doc1!.id, block_id: 'b1', status: 'current' }).select('id').single();
  const claimSourcePayload = { ...doiPayload, doi: '10.5555/test.claim.' + Date.now(), claimId: claimA!.id, evidenceLevel: 'metadata_only', evidenceText: 'Test evidence' };
  
  const claimPromises = Array(5).fill(0).map(() => 
    fetch(`${API_BASE}/works/${workA!.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify(claimSourcePayload)
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  const claimRes = await Promise.allSettled(claimPromises);
  let cIds = new Set();
  const claimErrors: any[] = [];
  for(const r of claimRes) {
    if (r.status === 'fulfilled') {
      if (r.value.data?.id) cIds.add(r.value.data.id);
      else claimErrors.push(r.value);
    }
  }
  
  // Verify DB state
  const { data: evidenceDb } = await supabaseA.from('claim_source_evidence').select('claim_id, source_id').eq('claim_id', claimA!.id);
  report('CLAIM: Concurrent Evidence Upsert', '1 logical evidence mapping, 1 source', evidenceDb?.length === 1 && cIds.size === 1, { evidenceCount: evidenceDb?.length, uniqueSources: cIds.size, errors: claimErrors });

  fs.writeFileSync('scratch/h6_report.json', JSON.stringify({ total, passed, failed, results }, null, 2));
  console.log(`\nTOTAL: ${total}\nPASSED: ${passed}\nFAILED: ${failed}`);
}

run().catch(console.error);
