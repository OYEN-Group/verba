/**
 * H6 Phase 4B — Pool Fixture Repair
 *
 * Root cause established: POST /api/documents/new calls create_blank_work_document,
 * an RPC that creates Work B + Document D internally and returns only documentId.
 * The provisioning script separately called POST /api/works which created Work A,
 * then recorded workId=Work A and documentId=Document D.
 * Document D's actual work_id is Work B, not Work A.
 *
 * This script repairs pool.json by replacing each fixture's workId with the
 * document's actual work_id (Work B), while preserving Work A's ID as
 * legacyWorkAId so cleanup can remove it.
 *
 * FAIL-CLOSED:
 *   pool.json is NOT replaced unless ALL fixtures pass:
 *   ✓ document exists
 *   ✓ document.user_id == fixture.userId  (owner check)
 *   ✓ actual work exists
 *   ✓ actualWork.user_id == fixture.userId  (work-owner check)
 *
 * Security: No credentials, tokens, or secrets are logged.
 *
 * Usage:
 *   npx tsx scratch/h6-p4b-repair-pool.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import type { PoolFile, UserFixture } from './h6-p4b-provision';

// ── Load .env.local ───────────────────────────────────────────────────────────
if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const POOL_PATH     = 'scratch/h6-p4b-pool.json';
const POOL_TEMP     = 'scratch/h6-p4b-pool-repair.tmp.json';

// Rate-limit pacing: 2 s between signIn calls (same as provision/harness)
const SIGNIN_PACE_MS = 2000;
const RATE_LIMIT_WAIT_MS = 70_000;
const MAX_RETRIES = 5;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('ABORT: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}
if (!fs.existsSync(POOL_PATH)) {
  console.error(`ABORT: ${POOL_PATH} not found.`);
  process.exit(1);
}

const pool: PoolFile & { users: (UserFixture & { legacyWorkAId?: string })[] } =
  JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

console.log('H6 PHASE 4B — POOL FIXTURE REPAIR');
console.log(`  Run ID:    ${pool.runId}`);
console.log(`  Fixtures:  ${pool.users.length}`);
console.log(`  Pool file: ${POOL_PATH}`);
console.log('');
console.log('Root cause: provisioning recorded Work A (POST /api/works) but');
console.log('documents belong to Work B (create_blank_work_document RPC).');
console.log('');
console.log('FAIL-CLOSED: pool.json is NOT replaced unless all fixtures pass.');
console.log('Security:    credentials/tokens are NOT logged.');
console.log('');

async function signIn(email: string, password: string): Promise<string | null> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error && data.session) return data.session.access_token;
    const msg = error?.message || '';
    const isRateLimit = msg.toLowerCase().includes('rate limit') ||
                        msg.toLowerCase().includes('too many') ||
                        msg.toLowerCase().includes('429');
    if (isRateLimit && attempt < MAX_RETRIES) {
      process.stdout.write(`\n  RATE LIMIT (attempt ${attempt + 1}) — waiting ${RATE_LIMIT_WAIT_MS / 1000}s...\n`);
      await sleep(RATE_LIMIT_WAIT_MS);
      continue;
    }
    // Not a rate-limit error, or exhausted retries — return null (caller handles)
    return null;
  }
  return null;
}

async function main() {
  const credMap = new Map(pool.credentials.map(c => [c.index, c]));
  const repairedUsers: (UserFixture & { legacyWorkAId?: string })[] = [];

  let validated     = 0;
  let repaired      = 0;
  let alreadyCorrect = 0;
  let ownerMismatches     = 0;
  let workOwnerMismatches = 0;
  let failures      = 0;

  for (const fixture of pool.users) {
    const cred = credMap.get(fixture.index);
    if (!cred) {
      console.error(`  FAIL user ${fixture.index}: no credentials in pool.credentials`);
      failures++;
      continue;
    }

    // ── Authenticate ────────────────────────────────────────────────────────
    const token = await signIn(cred.email, cred.password);
    if (!token) {
      console.error(`  FAIL user ${fixture.index}: signIn failed (credentials may have expired)`);
      failures++;
      await sleep(SIGNIN_PACE_MS);
      continue;
    }

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // ── Fetch document ───────────────────────────────────────────────────────
    const { data: doc, error: docErr } = await authed
      .from('documents')
      .select('id, user_id, work_id')
      .eq('id', fixture.documentId)
      .single();

    if (docErr || !doc) {
      console.error(`  FAIL user ${fixture.index}: document ${fixture.documentId} not found — ${docErr?.message ?? 'no row'}`);
      failures++;
      await sleep(SIGNIN_PACE_MS);
      continue;
    }

    // ── CHECK 1: document owner ──────────────────────────────────────────────
    if (doc.user_id !== fixture.userId) {
      console.error(`  OWNER MISMATCH user ${fixture.index}: expected_owner=${fixture.userId} actual_doc_owner=${doc.user_id}`);
      ownerMismatches++;
      failures++;
      await sleep(SIGNIN_PACE_MS);
      continue;
    }

    // ── Fetch actual work ────────────────────────────────────────────────────
    const { data: actualWork, error: workErr } = await authed
      .from('works')
      .select('id, user_id')
      .eq('id', doc.work_id)
      .single();

    if (workErr || !actualWork) {
      console.error(`  FAIL user ${fixture.index}: actual work ${doc.work_id} not found — ${workErr?.message ?? 'no row'}`);
      failures++;
      await sleep(SIGNIN_PACE_MS);
      continue;
    }

    // ── CHECK 2: actual work owner ───────────────────────────────────────────
    if (actualWork.user_id !== fixture.userId) {
      console.error(`  WORK OWNER MISMATCH user ${fixture.index}: expected=${fixture.userId} actual_work_owner=${actualWork.user_id}`);
      workOwnerMismatches++;
      failures++;
      await sleep(SIGNIN_PACE_MS);
      continue;
    }

    // ── All checks passed ────────────────────────────────────────────────────
    validated++;

    if (actualWork.id === fixture.workId) {
      // Already correct — no repair needed (safety path)
      repairedUsers.push({ ...fixture });
      alreadyCorrect++;
    } else {
      // Repair: preserve Work A for cleanup, point workId at Work B
      repairedUsers.push({
        ...fixture,
        workId: actualWork.id,           // Work B — document's actual work
        legacyWorkAId: fixture.workId,   // Work A — created by POST /api/works, now unused
      });
      repaired++;
    }

    process.stdout.write(`  Validated ${validated + failures}/${pool.users.length}...\r`);
    await sleep(SIGNIN_PACE_MS);
  }

  process.stdout.write('\n');
  console.log('');
  console.log('────────────────────────────────────────');
  console.log('VALIDATION SUMMARY');
  console.log(`  Total fixtures:            ${pool.users.length}`);
  console.log(`  Passed all checks:         ${validated}`);
  console.log(`  Failed:                    ${failures}`);
  console.log(`  Owner mismatches:          ${ownerMismatches}`);
  console.log(`  Work-owner mismatches:     ${workOwnerMismatches}`);
  console.log(`  Repaired (Work A → B):     ${repaired}`);
  console.log(`  Already correct:           ${alreadyCorrect}`);
  console.log(`  Legacy Work A IDs stored:  ${repaired} (field: legacyWorkAId)`);
  console.log('────────────────────────────────────────');

  // ── FAIL-CLOSED gate ─────────────────────────────────────────────────────
  if (failures > 0) {
    console.error(`\nSTOP: ${failures} fixture(s) failed validation.`);
    console.error('pool.json has NOT been modified.');
    console.error('Investigate the failures above, then re-run this script.');
    process.exit(1);
  }

  if (repairedUsers.length !== pool.users.length) {
    console.error(`\nSTOP: Expected ${pool.users.length} repaired fixtures, got ${repairedUsers.length}.`);
    console.error('pool.json has NOT been modified.');
    process.exit(1);
  }

  // ── Write temp file, then atomic rename ─────────────────────────────────
  const repairedPool = {
    ...pool,
    users: repairedUsers,
    repairedAt: new Date().toISOString(),
    repairNote: [
      'workId updated from Work A (POST /api/works) to Work B (create_blank_work_document RPC).',
      'legacyWorkAId preserved per fixture for exact-ID cleanup.',
      'No cross-user leakage: all documents owned by their expected users.',
    ].join(' '),
  };

  fs.writeFileSync(POOL_TEMP, JSON.stringify(repairedPool, null, 2), 'utf8');
  fs.renameSync(POOL_TEMP, POOL_PATH); // atomic on same filesystem

  console.log(`\n✓ Atomically replaced: ${POOL_PATH}`);
  console.log('  SECURITY: scratch/h6-p4b-pool.json is gitignored. Do not commit it.');
  console.log('\nNext step: regenerate h6-p4b-integrity.sql from the corrected pool,');
  console.log('then paste into Supabase SQL editor and run. Expect 0 rows.');
}

main().catch(e => {
  console.error('\nUnhandled error:', e?.message ?? e);
  process.exit(1);
});
