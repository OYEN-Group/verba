import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import type { PoolFile } from './h6-p4b-provision';

if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

const POOL_PATH = 'scratch/h6-p4b-pool.json';
const pool: PoolFile = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const userIds = pool.users.map(u => u.userId);
  const workIds = pool.users.map(u => u.workId);
  const legacyWorkIds = pool.users.map(u => (u as any).legacyWorkAId).filter(Boolean) as string[];
  const allWorkIds = [...workIds, ...legacyWorkIds];
  const documentIds = pool.users.map(u => u.documentId);
  const sourceIds = pool.users.flatMap(u => u.sourceIds);

  console.log('--- POST CLEANUP INTEGRITY ---');

  let failed = false;

  // Check Auth Users
  let authRemaining = 0;
  for (const uid of userIds) {
    const { data: { user } } = await client.auth.admin.getUserById(uid);
    if (user) {
      console.log(`[FAIL] Auth User still exists: ${uid}`);
      authRemaining++;
      failed = true;
    }
  }
  console.log(`Auth Users remaining: ${authRemaining}`);

  // Works
  const { data: works } = await client.from('works').select('id').in('id', allWorkIds);
  console.log(`Works remaining: ${works?.length || 0}`);
  if (works?.length) failed = true;

  // Documents
  const { data: docs } = await client.from('documents').select('id').in('id', documentIds);
  console.log(`Documents remaining: ${docs?.length || 0}`);
  if (docs?.length) failed = true;

  // Sources
  if (sourceIds.length > 0) {
    const { data: srcs } = await client.from('work_sources').select('id').in('id', sourceIds);
    console.log(`Sources remaining: ${srcs?.length || 0}`);
    if (srcs?.length) failed = true;
  } else {
    console.log(`Sources remaining: 0`);
  }

  // Citations
  const { data: citations } = await client.from('document_citations').select('id').in('document_id', documentIds);
  console.log(`Citations remaining: ${citations?.length || 0}`);
  if (citations?.length) failed = true;

  // Orphan Claims
  const { data: claims } = await client.from('claims').select('id').in('document_id', documentIds);
  console.log(`Claims remaining: ${claims?.length || 0}`);
  if (claims?.length) failed = true;

  // Rate limits
  const { data: rls } = await client.from('rate_limit_buckets').select('id').in('user_id', userIds);
  console.log(`Rate limits remaining: ${rls?.length || 0}`);
  if (rls?.length) failed = true;

  if (failed) {
    console.log('\nINTEGRITY CHECK FAILED.');
    process.exit(1);
  } else {
    console.log('\nALL RECORDS SUCCESSFULLY PURGED.');
  }
}

main().catch(console.error);
