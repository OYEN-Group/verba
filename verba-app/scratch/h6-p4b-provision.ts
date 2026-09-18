/**
 * H6 Phase 4B — Pre-provisioning Script
 *
 * Run BEFORE the load harness. NOT part of measured workload.
 * Writes scratch/h6-p4b-pool.json — gitignored, never committed.
 *
 * Usage:
 *   STAGING_API_BASE=https://your-preview.vercel.app/api \
 *   npx tsx scratch/h6-p4b-provision.ts
 *
 * Safety guards:
 *   - Refuses to run against production URLs
 *   - Does NOT use service_role
 *   - Generates unique per-user credential (randomBytes, never shared)
 *   - Stops and reports if staging auth cannot provision safely
 *   - Creates Work + Document via API routes (not direct DB inserts)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

// ── Load .env.local ────────────────────────────────────────────────────────────
if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

// ── Configuration ──────────────────────────────────────────────────────────────
const API_BASE = (process.env.STAGING_API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const TARGET_POOL_SIZE = parseInt(process.env.POOL_SIZE || '75', 10);
const RUN_ID = crypto.randomBytes(4).toString('hex');
const POOL_PATH = 'scratch/h6-p4b-pool.json';

// ── Safety guards ──────────────────────────────────────────────────────────────
const PROD_PATTERNS = ['app.verba.com', '/production', '-prod.vercel'];
if (PROD_PATTERNS.some(p => API_BASE.includes(p))) {
  console.error('ABORT: API_BASE appears to target production. Set STAGING_API_BASE correctly.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ABORT: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
  process.exit(1);
}

console.log('H6 PHASE 4B — USER PROVISIONING (SETUP PHASE — NOT MEASURED)');
console.log(`  API base:   ${API_BASE}`);
console.log(`  Supabase:   ${SUPABASE_URL}`);
console.log(`  Run ID:     ${RUN_ID}`);
console.log(`  Pool size:  ${TARGET_POOL_SIZE}`);
console.log(`  Pool file:  ${POOL_PATH}`);
console.log('');

// ── Types ──────────────────────────────────────────────────────────────────────
export interface UserFixture {
  index: number;
  email: string;
  userId: string;
  /** work_id read from documents.work_id after POST /api/documents/new.
   *  This is Work B — created internally by create_blank_work_document. */
  workId: string;
  documentId: string;
  /** Current editor_version. Starts at 0; updated after each successful save. */
  currentVersion: number;
  /** IDs of diagnostic sources created during load test, tracked for cleanup. */
  sourceIds: string[];
  /** Absent in fixed provisioning. Present only in pools repaired by h6-p4b-repair-pool.ts
   *  (legacy Work A IDs from the prior provisioning bug). Kept for exact-ID cleanup. */
  legacyWorkAId?: string;
}

export interface PoolFile {
  runId: string;
  apiBase: string;
  createdAt: string;
  users: UserFixture[];
  /**
   * Per-user credentials. pool.json is gitignored.
   * Passwords are generated at runtime — never committed, never shared.
   */
  credentials: Array<{ index: number; email: string; password: string }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function generatePassword(): string {
  return crypto.randomBytes(32).toString('hex'); // 64-char hex, unique per user
}

async function apiPost(
  path: string,
  token: string,
  body: unknown
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Phase 1: Check for existing accounts supplied via env ──────────────────────
async function loadExistingAccounts(): Promise<Array<{ email: string; password: string }>> {
  console.log('PHASE 1: Checking for pre-existing staging accounts...');
  const json = process.env.EXISTING_ACCOUNTS_JSON;
  if (json) {
    try {
      const accounts = JSON.parse(json) as Array<{ email: string; password: string }>;
      console.log(`  Found ${accounts.length} accounts in EXISTING_ACCOUNTS_JSON.`);
      return accounts;
    } catch (_) {
      console.warn('  WARN: EXISTING_ACCOUNTS_JSON is not valid JSON — ignoring.');
    }
  }
  console.log('  No existing accounts provided. Will probe auth config and provision new ones.');
  return [];
}

// ── Phase 2: Probe staging auth confirmation requirement ───────────────────────
async function probeAuthConfig(
  client: any
): Promise<'unconfirmed' | 'confirmed' | 'blocked'> {
  console.log('\nPHASE 2: Probing staging Auth email confirmation requirement...');
  const probeEmail = `h6-p4b-probe-${RUN_ID}@staging.test`;
  const probePassword = generatePassword();

  const { data, error } = await client.auth.signUp({ email: probeEmail, password: probePassword });

  if (error) {
    console.log(`  signUp returned error: ${error.message}`);
    console.log('  STAGING AUTH AUDIT RESULT: CONSTRAINT — signUp() is not usable.');
    console.log('  ACTION: Supply EXISTING_ACCOUNTS_JSON with pre-provisioned credentials.');
    return 'blocked';
  }

  if (data.session) {
    console.log('  STAGING AUTH AUDIT RESULT: PASS — email confirmation is OFF.');
    console.log('  signUp() returns a session immediately. Safe to provision new accounts.');
    // Sign out the probe account; it will not be tracked in the pool.
    await client.auth.signOut();
    return 'unconfirmed';
  }

  console.log('  STAGING AUTH AUDIT RESULT: CONSTRAINT — email confirmation is REQUIRED.');
  console.log('  signUp() did not return a session. Cannot provision 75 users without SMTP.');
  console.log('  Do NOT disable email confirmation in production settings for this test.');
  console.log('  ACTION: Supply EXISTING_ACCOUNTS_JSON with pre-provisioned credentials.');
  return 'confirmed';
}

// ── Phase 3: Authenticate all users (existing + new) ──────────────────────────
async function authenticatePool(
  client: any,
  existingAccounts: Array<{ email: string; password: string }>,
  authConfig: 'unconfirmed' | 'confirmed' | 'blocked',
  targetCount: number
): Promise<Array<{ index: number; email: string; password: string; userId: string; token: string }>> {
  console.log('\nPHASE 3: Authenticating user pool...');
  const pool: Array<{ index: number; email: string; password: string; userId: string; token: string }> = [];

  // Re-authenticate pre-existing accounts first
  for (let i = 0; i < Math.min(existingAccounts.length, targetCount); i++) {
    const { email, password } = existingAccounts[i];
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      console.warn(`  WARN: Could not authenticate ${email}: ${error?.message || 'no session'}`);
      continue;
    }
    pool.push({ index: pool.length + 1, email, password, userId: data.user!.id, token: data.session.access_token });
    if (pool.length % 10 === 0) console.log(`  Authenticated ${pool.length}/${targetCount}...`);
    await sleep(50);
  }

  // Provision new accounts if needed
  const remaining = targetCount - pool.length;
  if (remaining > 0) {
    if (authConfig !== 'unconfirmed') {
      console.error(`\nSTOP: Need ${remaining} more accounts but email confirmation is required.`);
      console.error('Cannot safely provision via signUp() on this staging project.');
      console.error('Provide pre-provisioned credentials via EXISTING_ACCOUNTS_JSON.');
      process.exit(1);
    }

    console.log(`  Provisioning ${remaining} new accounts (confirmation is OFF)...`);
    const RATE_LIMIT_WAIT_MS = 70_000; // 70s — Supabase Auth rate-limit window
    const MAX_RATE_LIMIT_RETRIES = 5;

    for (let i = 0; i < remaining; i++) {
      const idx = pool.length + 1;
      const email = `h6-p4b-${RUN_ID}-${idx}@staging.test`;
      const password = generatePassword(); // unique per user, never shared

      let signedUp = false;
      for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
        const { data, error } = await client.auth.signUp({ email, password });

        if (!error && data.session) {
          pool.push({ index: idx, email, password, userId: data.user!.id, token: data.session.access_token });
          if (pool.length % 10 === 0) console.log(`  Provisioned ${pool.length}/${targetCount}...`);
          signedUp = true;
          break;
        }

        const msg = error?.message || '';
        const isRateLimit = msg.toLowerCase().includes('rate limit') ||
                            msg.toLowerCase().includes('too many') ||
                            msg.toLowerCase().includes('429');

        if (isRateLimit && attempt < MAX_RATE_LIMIT_RETRIES) {
          console.warn(`  RATE LIMIT at user ${idx} (attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES}): ${msg}`);
          console.warn(`  Waiting ${RATE_LIMIT_WAIT_MS / 1000}s for Auth cooldown...`);
          await sleep(RATE_LIMIT_WAIT_MS);
          continue; // retry same user
        }

        // Non-rate-limit error, or exhausted retries
        console.error(`  signUp failed for user ${idx} after ${attempt + 1} attempt(s): ${msg || 'no session'}`);
        if (pool.length > 0) {
          console.warn(`  Partial pool: ${pool.length} accounts provisioned. Continuing with reduced pool.`);
          console.warn(`  Stages above ${pool.length} concurrent users will be skipped.`);
        } else {
          console.error('  Zero accounts provisioned. Cannot proceed.');
          process.exit(1);
        }
        break; // exit signup loop with partial pool
      }

      if (!signedUp) break; // partial pool — stop trying

      // Pace signups: 2 s between accounts to stay well under rate limits
      await sleep(2000);
    }
  }

  if (pool.length < 1) {
    console.error('\nSTOP: No users authenticated. Cannot proceed.');
    process.exit(1);
  }
  if (pool.length < targetCount) {
    console.warn(`\nPARTIAL POOL: ${pool.length}/${targetCount} users provisioned.`);
    console.warn('Stages requiring more concurrent users than pool size will be skipped.');
  } else {
    console.log(`  Auth complete: ${pool.length}/${targetCount} users ready.`);
  }
  return pool;
}

// ── Phase 4: Create Document per user via API, resolve actual work_id ─────────
//
// POST /api/documents/new calls create_blank_work_document, an RPC that creates
// Work + Document together and returns only documentId. We resolve the document's
// actual work_id via the authenticated user's Supabase client and verify ownership
// before accepting the fixture.
//
// We do NOT call POST /api/works separately — that created an unrelated Work A
// which caused pool.json to record a workId that didn't match the document's
// actual work_id. The document's work (Work B) is the correct work for all
// source and citation operations.
async function createFixtures(
  authedPool: Array<{ index: number; email: string; password: string; userId: string; token: string }>
): Promise<UserFixture[]> {
  console.log('\nPHASE 4: Creating Document per user via API and resolving actual work_id...');
  const fixtures: UserFixture[] = [];

  for (const u of authedPool) {
    // Create document (RPC creates Work B + Document D internally)
    const docRes = await apiPost('/documents/new', u.token, { type: 'blank' });
    if (docRes.status !== 200 || !docRes.data?.documentId) {
      console.error(`  STOP: Document creation failed for user ${u.index}: status=${docRes.status} ${JSON.stringify(docRes.data)}`);
      process.exit(1);
    }
    const documentId: string = docRes.data.documentId;

    // Resolve the document's actual work_id via the authenticated Supabase client.
    // We cannot avoid this lookup because POST /api/documents/new does not return workId.
    // We do not use POST /api/works — that would create an unrelated orphan Work.
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${u.token}` } },
    });
    const { data: doc, error: docLookupErr } = await authedClient
      .from('documents')
      .select('id, user_id, work_id')
      .eq('id', documentId)
      .single();

    if (docLookupErr || !doc) {
      console.error(`  STOP: Could not resolve work_id for document ${documentId} (user ${u.index}): ${docLookupErr?.message ?? 'no row'}`);
      process.exit(1);
    }

    // Ownership verification — refuse fixture if document doesn't belong to expected user
    if (doc.user_id !== u.userId) {
      console.error(`  STOP: Document owner mismatch for user ${u.index}: expected=${u.userId} actual=${doc.user_id}`);
      process.exit(1);
    }

    fixtures.push({
      index: u.index,
      email: u.email,
      userId: u.userId,
      workId: doc.work_id,   // Work B — document's actual work, from DB
      documentId,
      currentVersion: 0,     // harness will sync after first save
      sourceIds: [],
    });

    if (fixtures.length % 10 === 0) {
      console.log(`  Created fixtures for ${fixtures.length}/${authedPool.length} users...`);
    }
    await sleep(100);
  }

  console.log(`  Fixture creation complete: ${fixtures.length} users.`);
  return fixtures;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const existingAccounts = await loadExistingAccounts();
  const authConfig = await probeAuthConfig(client);

  if (authConfig === 'blocked' && existingAccounts.length < TARGET_POOL_SIZE) {
    console.error('\nSTOP: Auth config is blocked and not enough existing accounts provided.');
    console.error('Resolve staging auth configuration before running Phase 4B.');
    process.exit(1);
  }

  const authedPool = await authenticatePool(client, existingAccounts, authConfig, TARGET_POOL_SIZE);
  const fixtures = await createFixtures(authedPool);

  const poolFile: PoolFile = {
    runId: RUN_ID,
    apiBase: API_BASE,
    createdAt: new Date().toISOString(),
    users: fixtures,
    credentials: authedPool.map(u => ({ index: u.index, email: u.email, password: u.password })),
  };

  fs.writeFileSync(POOL_PATH, JSON.stringify(poolFile, null, 2), 'utf8');

  console.log(`\n✓ Pool written to ${POOL_PATH}`);
  console.log(`  Users:    ${fixtures.length}`);
  console.log(`  Run ID:   ${RUN_ID}`);
  console.log(`  SECURITY: ${POOL_PATH} is gitignored. Do not commit it.`);
  console.log('\nNext step — run the harness:');
  console.log(`  STAGING_API_BASE=${API_BASE} npx tsx scratch/h6-p4b-harness.ts`);
}

main().catch(err => { console.error('Provisioning failed:', err); process.exit(1); });
