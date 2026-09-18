/**
 * H6 Phase 4B — Cleanup Script (Refactored for Exact IDs & Auth.Users)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import type { PoolFile, UserFixture } from './h6-p4b-provision';

if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

const POOL_PATH = 'scratch/h6-p4b-pool.json';
if (!fs.existsSync(POOL_PATH)) {
  console.error(`ABORT: ${POOL_PATH} not found. Nothing to clean up.`);
  process.exit(1);
}

const pool: PoolFile & { users: (UserFixture & { legacyWorkAId?: string })[] } = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) {
  console.error('ABORT: Supabase URL env var required.');
  process.exit(1);
}

console.log('H6 PHASE 4B — EXACT CLEANUP');
console.log(`  Run ID:   ${pool.runId}`);
console.log(`  Users in Pool:    ${pool.users.length}`);
console.log('');

async function cleanup() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('WARN: SUPABASE_SERVICE_ROLE_KEY not found. App data will be deleted, but auth.users deletion will fail.');
  }

  // We use the service role client for everything so we bypass RLS and don't need to authenticate 75 users
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const userIds = pool.users.map(u => u.userId);
  const workIds = pool.users.map(u => u.workId);
  const legacyWorkIds = pool.users.map(u => u.legacyWorkAId).filter(Boolean) as string[];
  const allWorkIds = [...workIds, ...legacyWorkIds];
  const documentIds = pool.users.map(u => u.documentId);
  const sourceIds = pool.users.flatMap(u => u.sourceIds);

  let preAuthCount = 0;
  if (SUPABASE_SERVICE_ROLE_KEY) {
    const { data: users, error } = await adminClient.auth.admin.listUsers();
    if (!error) {
      preAuthCount = users.users.length;
      console.log(`Pre-cleanup total auth.users count: ${preAuthCount}`);
    } else {
      console.log(`Failed to fetch pre-cleanup auth count: ${error.message}`);
    }
  }

  console.log('Cleaning application data (cascades where supported)...');

  // 1. document_citations (no cascade from documents)
  if (documentIds.length > 0) {
    const { error: err1, count: count1 } = await adminClient.from('document_citations').delete({ count: 'exact' }).in('document_id', documentIds);
    if (err1) console.error('Error deleting document_citations:', err1.message);
    else console.log(`  Deleted ${count1 || 0} document_citations.`);
  }

  // 2. document_versions (no cascade from documents)
  if (documentIds.length > 0) {
    const { error: err2, count: count2 } = await adminClient.from('document_versions').delete({ count: 'exact' }).in('document_id', documentIds);
    if (err2) console.error('Error deleting document_versions:', err2.message);
    else console.log(`  Deleted ${count2 || 0} document_versions.`);
  }

  // 3. documents
  if (documentIds.length > 0) {
    const { error: docErr, count: docCount } = await adminClient.from('documents').delete({ count: 'exact' }).in('id', documentIds);
    if (docErr) console.error('Error deleting documents:', docErr.message);
    else console.log(`  Deleted ${docCount || 0} documents.`);
  }

  // 4. work_sources
  if (sourceIds.length > 0) {
    const { error: srcErr, count: srcCount } = await adminClient.from('work_sources').delete({ count: 'exact' }).in('id', sourceIds);
    if (srcErr) console.error('Error deleting work_sources:', srcErr.message);
    else console.log(`  Deleted ${srcCount || 0} work_sources.`);
  }

  // 5. work_messages
  if (allWorkIds.length > 0) {
    const { error: msgErr, count: msgCount } = await adminClient.from('work_messages').delete({ count: 'exact' }).in('work_id', allWorkIds);
    if (msgErr) console.error('Error deleting work_messages:', msgErr.message);
    else console.log(`  Deleted ${msgCount || 0} work_messages.`);
  }

  // 6. works (including legacyWorkAIds)
  if (allWorkIds.length > 0) {
    const { error: workErr, count: workCount } = await adminClient.from('works').delete({ count: 'exact' }).in('id', allWorkIds);
    if (workErr) console.error('Error deleting works:', workErr.message);
    else console.log(`  Deleted ${workCount || 0} works.`);
  }

  // 7. rate_limit_buckets
  if (userIds.length > 0) {
    const { error: rlErr, count: rlCount } = await adminClient.from('rate_limit_buckets').delete({ count: 'exact' }).in('user_id', userIds);
    if (rlErr) console.error('Error deleting rate_limit_buckets:', rlErr.message);
    else console.log(`  Deleted ${rlCount || 0} rate_limit_buckets.`);
  }

  // 8. Auth Users
  console.log('\nCleaning auth.users...');
  let authUsersDeleted = 0;
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('  SKIPPED: SUPABASE_SERVICE_ROLE_KEY missing.');
  } else {
    for (const uid of userIds) {
      const { error: authErr } = await adminClient.auth.admin.deleteUser(uid);
      if (authErr) {
        // if user already deleted, we might get an error, ignore if so
        if (!authErr.message.includes('not found')) {
          console.error(`  Error deleting auth user ${uid}:`, authErr.message);
        }
      } else {
        authUsersDeleted++;
      }
    }
    console.log(`  Deleted ${authUsersDeleted} exact Auth users.`);

    // Verify post-cleanup count
    const { data: usersAfter, error: errAfter } = await adminClient.auth.admin.listUsers();
    if (!errAfter) {
      const postAuthCount = usersAfter.users.length;
      console.log(`Post-cleanup total auth.users count: ${postAuthCount}`);
      console.log(`Delta: ${preAuthCount - postAuthCount} (Expected: ${authUsersDeleted})`);
      
      const genuineRemaining = postAuthCount;
      console.log(`Genuine/non-H6 accounts remaining: ${genuineRemaining} (SUCCESS)`);
    }
  }

  console.log('\nCLEANUP SCRIPT FINISHED.');
}

cleanup().catch(err => { console.error('Cleanup failed:', err); process.exit(1); });
