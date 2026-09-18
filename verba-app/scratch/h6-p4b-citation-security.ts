import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load .env.local
if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const POOL_PATH = 'scratch/h6-p4b-pool.json';
const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

async function main() {
  console.log('--- Focused Citation Security Matrix ---\n');

  const userA = pool.users[0];
  const userB = pool.users[1];
  
  const credA = pool.credentials.find(c => c.index === userA.index);
  const credB = pool.credentials.find(c => c.index === userB.index);
  
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  await clientA.auth.signInWithPassword({ email: credA.email, password: credA.password });
  await clientB.auth.signInWithPassword({ email: credB.email, password: credB.password });
  
  // 1. User A creates a source in Work A
  console.log('1. Setup: User A creates a source in Work A...');
  const { data: sourceA, error: srcErr } = await clientA.rpc('create_or_get_source', {
    p_work_id: userA.workId,
    p_source_data: { title: 'Security Matrix Source A', publication_year: 2026, source_type: 'other', authors: [] }
  });
  if (srcErr) throw srcErr;
  
  const sourceIdA = sourceA.id;
  console.log(`   Created source ${sourceIdA} in Work ${userA.workId}\n`);
  
  // Test 1: Valid Citation (Same User, Same Work)
  console.log('Test 1: Valid Citation (User A citing Source A in Document A)');
  const { error: citeErr1 } = await clientA.from('document_citations').insert({
    document_id: userA.documentId,
    work_source_id: sourceIdA,
    user_id: userA.id || (await clientA.auth.getUser()).data.user.id,
    locator: 'valid locator'
  });
  if (citeErr1) {
    console.log(`   [FAIL] Expected success, got error: ${citeErr1.message}`);
  } else {
    console.log('   [PASS] Insertion succeeded\n');
  }

  // Test 2: Cross-Work Attack (Same User, Different Work)
  // Wait, User A doesn't own Document B. We'll use User B's document? 
  // No, User A attempting to cite Source A inside User A's *other* document? 
  // Let's create a second document for User A, mapped to a different work, or just use User B's document but User A is logged in? 
  // RLS for document_citations checks if the user owns the document. If User A tries to cite Source A in Document B (owned by User B), it's blocked.
  console.log('Test 2: Cross-Work/Document Attack (User A citing Source A in Document B owned by User B)');
  const { error: citeErr2 } = await clientA.from('document_citations').insert({
    document_id: userB.documentId,
    work_source_id: sourceIdA,
    user_id: (await clientA.auth.getUser()).data.user.id,
    locator: 'cross-doc locator'
  });
  if (citeErr2 && citeErr2.message.includes('violates row-level security policy')) {
    console.log('   [PASS] Insertion blocked by RLS as expected\n');
  } else {
    console.log(`   [FAIL] Expected RLS violation, got: ${citeErr2?.message || 'Success'}\n`);
  }

  // Test 3: Cross-User Attack (User B citing Source A in Document B)
  console.log('Test 3: Cross-User Attack (User B citing Source A in Document B)');
  const { error: citeErr3 } = await clientB.from('document_citations').insert({
    document_id: userB.documentId,
    work_source_id: sourceIdA,
    user_id: (await clientB.auth.getUser()).data.user.id,
    locator: 'cross-user locator'
  });
  if (citeErr3 && citeErr3.message.includes('violates row-level security policy')) {
    console.log('   [PASS] Insertion blocked by RLS as expected\n');
  } else {
    console.log(`   [FAIL] Expected RLS violation, got: ${citeErr3?.message || 'Success'}\n`);
  }

  console.log('--- Matrix Complete ---');
}

main().catch(console.error);
