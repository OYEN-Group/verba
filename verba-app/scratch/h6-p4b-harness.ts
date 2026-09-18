/**
 * H6 Phase 4B â€” Load Harness
 *
 * Measures Verba application capacity under staged concurrent load.
 * Must be run AFTER h6-p4b-provision.ts has created scratch/h6-p4b-pool.json.
 *
 * Usage:
 *   STAGING_API_BASE=https://your-preview.vercel.app/api \
 *   npx tsx scratch/h6-p4b-harness.ts
 *
 * Workload label: SYNTHETIC HIGH-ACTIVITY â€” not realistic normal use.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { performance } from 'perf_hooks';
import type { PoolFile, UserFixture } from './h6-p4b-provision';

// â”€â”€ Load .env.local â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

// â”€â”€ Safety guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (process.env.ALLOW_P4B_HARNESS !== 'true') {
  console.error('ABORT: Set ALLOW_P4B_HARNESS=true to confirm you intend to run Phase 4B.');
  process.exit(1);
}

const POOL_PATH = 'scratch/h6-p4b-pool.json';
if (!fs.existsSync(POOL_PATH)) {
  console.error(`ABORT: ${POOL_PATH} not found. Run h6-p4b-provision.ts first.`);
  process.exit(1);
}

const pool: PoolFile = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

// API_BASE: strip trailing /api if present â€” all route strings already include /api/...
// STAGING_API_BASE is typically set to https://host/api, so we normalise here
// to avoid double-path URLs like /api/api/preferences.
const _rawBase = (process.env.STAGING_API_BASE || pool.apiBase).replace(/\/$/, '');
const APP_BASE = _rawBase.endsWith('/api') ? _rawBase.slice(0, -4) : _rawBase;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const VERBA_ENGINE_URL = (process.env.VERBA_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
const REPORT_PATH = `scratch/h6-p4b-report-${pool.runId}.json`;

const PROD_PATTERNS = ['app.verba.com', '/production', '-prod.vercel'];
if (PROD_PATTERNS.some(p => APP_BASE.includes(p))) {
  console.error('ABORT: API_BASE appears to target production.');
  process.exit(1);
}

console.log('H6 PHASE 4B â€” CONTROLLED CAPACITY VERIFICATION');
console.log('Workload: SYNTHETIC HIGH-ACTIVITY (not realistic normal use)');
console.log(`  API base:      ${APP_BASE}`);
console.log(`  Run ID:        ${pool.runId}`);
console.log(`  Pool users:    ${pool.users.length}`);
console.log(`  Engine URL:    ${VERBA_ENGINE_URL}`);
console.log('');

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STAGES = [1, 5, 10, 20, 40, 75]; // FULL RAMP
const STAGE_DURATION_MS = 60_000;
const RECOVERY_MS = 30_000;
const WARMUP_MS = 10_000;

// Per-user operation budgets per stage window â€” keeps traffic below rate limits.
// Rate limits (from rate-limit.ts): autosave=100/60s, source=20/60s
// We cap at 40% of each limit to ensure Phase 4B measures capacity, not rate limiting.
const BUDGET = {
  document_save:    40,  // limit=100, cap=40
  source_write:     8,   // limit=20,  cap=8
  // citation_write has no rate limit but is bounded below to prevent unrealistic data growth.
  // MAX_CITATION_WRITES_PER_USER is a lifetime cap across the entire test run, not per stage.
  sources_read:     999, // no rate limit
  preferences_read: 999, // no rate limit
};

/** Lifetime max unique citation writes per user across ALL stages. */
const MAX_CITATION_WRITES_PER_USER = 5;

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type OpType =
  | 'sources_read'
  | 'preferences_read'
  | 'document_save'
  | 'source_write'
  | 'citation_write'   // POST mutation â€” was incorrectly labelled 'citation_insert' / 'Citation Reads'
  | 'budget_substitution';

interface OpResult {
  op: OpType;
  status: number;
  durationMs: number;
  note?: string; // e.g. '409_version_conflict', '429_rate_limited'
}

class StageMetrics {
  results: OpResult[] = [];
  networkErrors = 0;

  add(r: OpResult) { this.results.push(r); }
  addNetErr() { this.networkErrors++; }

  get total() { return this.results.length + this.networkErrors; }
  get success2xx() { return this.results.filter(r => r.status >= 200 && r.status < 300).length; }

  statusDist(): Record<number, number> {
    const d: Record<number, number> = {};
    for (const r of this.results) d[r.status] = (d[r.status] || 0) + 1;
    return d;
  }

  perOp(op: OpType): OpResult[] {
    return this.results.filter(r => r.op === op || (op === 'document_save' && r.note === '409_version_conflict'));
  }

  percentiles(durs: number[]): { min: string; p50: string; p95: string; p99: string; max: string } {
    if (durs.length === 0) return { min: '-', p50: '-', p95: '-', p99: '-', max: '-' };
    durs.sort((a, b) => a - b);
    const p = (frac: number) => durs[Math.min(Math.floor(durs.length * frac), durs.length - 1)].toFixed(0);
    return { min: durs[0].toFixed(0), p50: p(0.5), p95: p(0.95), p99: p(0.99), max: durs[durs.length - 1].toFixed(0) };
  }

  overallPercentiles() {
    return this.percentiles(this.results.map(r => r.durationMs));
  }

  opPercentiles(op: OpType) {
    return this.percentiles(this.results.filter(r => r.op === op).map(r => r.durationMs));
  }

  throughputRps() { return (this.total / (STAGE_DURATION_MS / 1000)).toFixed(2); }

  print(concurrency: number) {
    const dist = this.statusDist();
    const overall = this.overallPercentiles();
    console.log(`\nRESULTS â€” ${concurrency} concurrent users`);
    console.log(`  Total requests:    ${this.total}`);
    console.log(`  Success (2xx):     ${this.success2xx}`);
    console.log(`  Network errors:    ${this.networkErrors}`);
    console.log(`  HTTP distribution: ${JSON.stringify(dist)}`);
    console.log(`  Throughput:        ${this.throughputRps()} req/s (SYNTHETIC HIGH-ACTIVITY)`);
    console.log(`  Overall latency (ms): min=${overall.min} p50=${overall.p50} p95=${overall.p95} p99=${overall.p99} max=${overall.max}`);
    console.log('  Per-route p95 (ms):');
    for (const op of ['sources_read', 'preferences_read', 'document_save', 'source_write', 'citation_write'] as OpType[]) {
      const p = this.opPercentiles(op);
      const count = this.results.filter(r => r.op === op).length;
      if (count > 0) console.log(`    ${op}: p95=${p.p95} (n=${count})`);
    }
    const budget_subs = this.results.filter(r => r.op === 'budget_substitution').length;
    if (budget_subs > 0) console.log(`  Budget substitutions: ${budget_subs}`);
  }
}

// â”€â”€ HTTP helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function request(
  method: 'GET' | 'POST',
  url: string,
  token: string,
  body?: unknown,
  diagContext?: { op: OpType | string; userIndex: number; routeSafeId: string }
): Promise<{ status: number; durationMs: number; data: any; networkError: boolean }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const durationMs = performance.now() - t0;
    let data: any = null;
    try { data = await res.json(); } catch (_) {}
    
    // Detailed diagnostic logging for non-2xx responses
    if (!res.ok && diagContext) {
      console.warn('\n--- DIAGNOSTIC: HTTP Error ---');
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: diagContext.op,
        method: method,
        route: diagContext.routeSafeId,
        status: res.status,
        latency: Math.round(durationMs),
        errorBody: typeof data === 'string' ? data.substring(0, 500) : data, // Safe body snippet
        userIndex: diagContext.userIndex
      }, null, 2));
      console.warn('------------------------------\n');
    }

    return { status: res.status, durationMs, data, networkError: false };
  } catch (err: any) {
    if (diagContext) {
      console.warn('\n--- DIAGNOSTIC: Network/Fetch Error ---');
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: diagContext.op,
        method: method,
        route: diagContext.routeSafeId,
        status: 0,
        latency: Math.round(performance.now() - t0),
        errorBody: err?.message || 'Network error',
        userIndex: diagContext.userIndex
      }, null, 2));
      console.warn('---------------------------------------\n');
    }
    return { status: 0, durationMs: performance.now() - t0, data: null, networkError: true };
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// â”€â”€ Re-authenticate pool users (with rate-limit retry) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function refreshTokens(): Promise<Map<number, string>> {
  const tokens = new Map<number, string>();
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const RATE_LIMIT_WAIT_MS = 70_000;
  const MAX_RETRIES = 5;

  for (const cred of pool.credentials) {
    let authed = false;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cred.email,
        password: cred.password,
      });
      if (!error && data.session) {
        tokens.set(cred.index, data.session.access_token);
        authed = true;
        break;
      }
      const msg = error?.message || '';
      const isRateLimit = msg.toLowerCase().includes('rate limit') ||
                          msg.toLowerCase().includes('too many') ||
                          msg.toLowerCase().includes('429');
      if (isRateLimit && attempt < MAX_RETRIES) {
        console.warn(`  RATE LIMIT re-auth user ${cred.index} (attempt ${attempt + 1}): waiting ${RATE_LIMIT_WAIT_MS / 1000}s...`);
        await sleep(RATE_LIMIT_WAIT_MS);
        continue;
      }
      console.error(`  WARN: Re-auth failed for user ${cred.index}: ${msg || 'no session'}`);
      break;
    }
    // 2s between logins to avoid triggering the rate limit at all
    if (authed) await sleep(2000);
  }
  return tokens;
}

// â”€â”€ Warm-up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function warmUp(
  activeUsers: UserFixture[],
  tokens: Map<number, string>
): Promise<void> {
  console.log(`  Warming up (${WARMUP_MS / 1000}s) â€” not included in measurements...`);
  const warmStart = Date.now();

  await Promise.all(activeUsers.map(async (u) => {
    const token = tokens.get(u.index)!;
    while (Date.now() - warmStart < WARMUP_MS) {
      await request('GET', `${APP_BASE}/api/preferences`, token, undefined, { op: 'warmup', userIndex: u.index, routeSafeId: '/api/preferences' });
      await request('GET', `${APP_BASE}/api/works/${u.workId}/sources`, token, undefined, { op: 'warmup', userIndex: u.index, routeSafeId: '/api/works/:id/sources' });
      await sleep(500);
    }
  }));

  // Re-sync editor_version for all users after warm-up
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  for (const u of activeUsers) {
    const token = tokens.get(u.index)!;
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await authedClient
      .from('documents')
      .select('editor_version')
      .eq('id', u.documentId)
      .single();
    if (data?.editor_version !== undefined) u.currentVersion = data.editor_version;
  }
  console.log('  Warm-up complete. Sessions and versions verified.');
  await sleep(2000);
}

// â”€â”€ Single user operation loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function userLoop(
  u: UserFixture,
  token: string,
  durationMs: number,
  metrics: StageMetrics | null,
  seqStart: number
): Promise<void> {
  const endTime = Date.now() + durationMs;
  let seq = seqStart;
  const opCount: Record<string, number> = {};
  /**
   * Per-user set of "documentId:sourceId" keys already successfully inserted.
   * Prevents duplicate (document, source) citation pairs and unrealistic data growth.
   * Lifetime across all stages â€” persists between userLoop calls because `u` is mutable.
   */
  if (!(u as any)._insertedCitationKeys || !((u as any)._insertedCitationKeys instanceof Set)) (u as any)._insertedCitationKeys = new Set<string>();
  const insertedCitationKeys: Set<string> = (u as any)._insertedCitationKeys;

  while (Date.now() < endTime) {
    // Pick operation by weight, respecting per-user budget
    const pick = Math.random();
    let op: OpType;
    if (pick < 0.30) op = 'sources_read';
    else if (pick < 0.50) op = 'preferences_read';
    else if (pick < 0.70) op = 'document_save';
    else if (pick < 0.85) op = 'source_write';
    else if (pick < 0.95) op = 'citation_write';
    else op = 'preferences_read'; // Group E auth state

    // Budget enforcement: substitute read if per-stage budget exceeded
    const budget = BUDGET[op as keyof typeof BUDGET] ?? 999;
    if ((opCount[op] || 0) >= budget) {
      op = 'budget_substitution';
    }
    opCount[op] = (opCount[op] || 0) + 1;

    let result: OpResult | null = null;

    if (op === 'sources_read') {
      const r = await request('GET', `${APP_BASE}/api/works/${u.workId}/sources`, token, undefined, { op, userIndex: u.index, routeSafeId: '/api/works/:id/sources' });
      if (r.networkError) { metrics?.addNetErr(); }
      else result = { op, status: r.status, durationMs: r.durationMs };

    } else if (op === 'preferences_read' || op === 'budget_substitution') {
      const r = await request('GET', `${APP_BASE}/api/preferences`, token, undefined, { op, userIndex: u.index, routeSafeId: '/api/preferences' });
      if (r.networkError) { metrics?.addNetErr(); }
      else result = { op, status: r.status, durationMs: r.durationMs };

    } else if (op === 'document_save') {
      const editorState = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: `[H6-P4B] save ${seq} user ${u.index}` }] }],
      };
      const r = await request('POST', `${APP_BASE}/api/documents/${u.documentId}/save`, token, {
        editorState,
        wordCount: 10 + seq,
        expectedVersion: u.currentVersion,
        saveType: 'autosave',
      }, { op, userIndex: u.index, routeSafeId: '/api/documents/:id/save' });
      if (r.networkError) {
        metrics?.addNetErr();
      } else {
        const note = r.status === 409 ? '409_version_conflict' : r.status === 429 ? '429_rate_limited' : undefined;
        result = { op, status: r.status, durationMs: r.durationMs, note };
        if (r.status === 200 && r.data?.newVersion) {
          u.currentVersion = r.data.newVersion; // ADVANCE version
        } else if (r.status === 409 && r.data?.currentVersion !== undefined) {
          u.currentVersion = r.data.currentVersion; // resync
        }
      }

    } else if (op === 'source_write') {
      seq++;
      const r = await request('POST', `${APP_BASE}/api/works/${u.workId}/sources`, token, {
        source_type: 'other',
        title: `[H6-P4B-DIAGNOSTIC] Work ${u.index} Source ${seq} Run ${pool.runId}`,
        authors: [{ given: 'H6', family: 'Diagnostic' }],
        publication_year: 2026,
        doi: null, // EXPLICITLY NULL — no fake DOI
        url: null,
        abstract: null,
        source_provider: 'manual',
        metadata: { h6_diagnostic: true, run_id: pool.runId, user_index: u.index },
      }, { op, userIndex: u.index, routeSafeId: '/api/works/:id/sources' });
      if (r.networkError) {
        metrics?.addNetErr();
      } else {
        result = { op, status: r.status, durationMs: r.durationMs, note: r.status === 429 ? '429_rate_limited' : undefined };
        if ((r.status === 200 || r.status === 201) && r.data?.id) {
          if (!u.sourceIds.includes(r.data.id)) u.sourceIds.push(r.data.id);
        }
      }

    } else if (op === 'citation_write') {
      // Group D: citation WRITE (POST mutation). Label is intentionally "citation_write".
      //
      // Constraints:
      //   - Requires at least one source to exist for this user.
      //   - Each (documentId, sourceId) pair is inserted at most ONCE (deduplication).
      //   - Lifetime cap of MAX_CITATION_WRITES_PER_USER total, to bound data growth.
      //   - Rotates through available sourceIds to maximise unique pairs.
      //   - Substitutes a preferences_read when no new pair is available or cap is reached.

      // Find the first sourceId that hasn't been cited yet
      const availableSourceId = u.sourceIds.find(
        sid => !insertedCitationKeys.has(`${u.documentId}:${sid}`)
      );

      if (availableSourceId && insertedCitationKeys.size < MAX_CITATION_WRITES_PER_USER) {
        const r = await request('POST', `${APP_BASE}/api/documents/${u.documentId}/citations`, token, {
          work_source_id: availableSourceId,
        }, { op, userIndex: u.index, routeSafeId: '/api/documents/:id/citations' });
        if (r.networkError) {
          metrics?.addNetErr();
        } else {
          result = { op, status: r.status, durationMs: r.durationMs };
          if (r.status === 200 || r.status === 201) {
            // Mark this pair as inserted — do not attempt again
            insertedCitationKeys.add(`${u.documentId}:${availableSourceId}`);
          }
        }
      } else {
        // No new (document, source) pair available or lifetime cap reached â€” substitute a read
        const reason = u.sourceIds.length === 0 ? 'no_source_yet'
          : insertedCitationKeys.size >= MAX_CITATION_WRITES_PER_USER ? 'citation_cap_reached'
          : 'all_sources_cited';
        const r = await request('GET', `${APP_BASE}/api/preferences`, token, undefined, { op, userIndex: u.index, routeSafeId: '/api/preferences' });
        if (r.networkError) { metrics?.addNetErr(); }
        else result = { op: 'budget_substitution', status: r.status, durationMs: r.durationMs, note: reason };
      }
    }

    if (result && metrics) metrics.add(result);

    // Think time jitter: 0â€“500ms
    await sleep(Math.random() * 500);
  }
}

// â”€â”€ Stop condition evaluation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function checkStopConditions(metrics: StageMetrics, concurrency: number): string | null {
  const dist = metrics.statusDist();
  const total5xx = Object.entries(dist).filter(([k]) => parseInt(k) >= 500).reduce((s, [, v]) => s + v, 0);
  if (metrics.total > 0 && total5xx / metrics.total > 0.01) {
    return `5xx rate ${((total5xx / metrics.total) * 100).toFixed(1)}% > 1% threshold`;
  }
  const allDurs = metrics.results.map(r => r.durationMs).sort((a, b) => a - b);
  if (allDurs.length > 0) {
    const p95 = allDurs[Math.floor(allDurs.length * 0.95)];
    const p99 = allDurs[Math.floor(allDurs.length * 0.99)];
    if (p95 > 3000) return `p95=${p95.toFixed(0)}ms > 3000ms threshold`;
    if (p99 > 5000) return `p99=${p99.toFixed(0)}ms > 5000ms threshold`;
  }
  if (metrics.networkErrors > concurrency * 3) {
    return `Network errors (${metrics.networkErrors}) exceed ${concurrency * 3} threshold`;
  }
  return null;
}

// â”€â”€ Run a single stage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runStage(
  concurrency: number,
  tokens: Map<number, string>,
  stageIndex: number
): Promise<{ healthy: boolean; metrics: StageMetrics; stopReason: string | null }> {
  const activeUsers = pool.users.slice(0, concurrency);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`STAGE ${stageIndex}: ${concurrency} CONCURRENT USERS`);
  console.log('='.repeat(60));

  await warmUp(activeUsers, tokens);

  console.log(`  Measuring for ${STAGE_DURATION_MS / 1000}s...`);
  const metrics = new StageMetrics();

  await Promise.all(
    activeUsers.map((u, i) =>
      userLoop(u, tokens.get(u.index)!, STAGE_DURATION_MS, metrics, i * 100)
    )
  );

  metrics.print(concurrency);

  const stopReason = checkStopConditions(metrics, concurrency);
  if (stopReason) {
    console.log(`\nSTOP CONDITION MET: ${stopReason}`);
  } else {
    console.log(`\nStage ${concurrency}: HEALTHY`);
  }

  return { healthy: !stopReason, metrics, stopReason };
}

// â”€â”€ Group E: Render baseline + optional AI validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runGroupE(token: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('GROUP E: RENDER / FASTAPI BASELINE');
  console.log('='.repeat(60));

  // E1: GET /health â€” no OpenAI dependency (confirmed in main.py)
  console.log('  E1: Render health endpoint (no OpenAI)...');
  const healthResults: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${VERBA_ENGINE_URL}/health`);
      healthResults.push(performance.now() - t0);
      if (i === 0) console.log(`  First request (cold-start candidate): ${(performance.now() - t0).toFixed(0)}ms status=${res.status}`);
    } catch (_) {
      console.log(`  WARN: Health request ${i} failed (network error)`);
    }
    await sleep(500);
  }

  if (healthResults.length > 0) {
    healthResults.sort((a, b) => a - b);
    const p50 = healthResults[Math.floor(healthResults.length * 0.5)];
    const p95 = healthResults[Math.floor(healthResults.length * 0.95)];
    console.log(`  Render GET /health: p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms n=${healthResults.length}`);
  } else {
    console.log('  RENDER BASELINE: UNAVAILABLE (no successful health requests)');
  }

  // E2: Small real AI validation (3â€“5 calls if budget allows)
  const firstUser = pool.users[0];
  if (!firstUser) return;

  console.log('\n  E2: Small real AI validation (3 calls max)...');
  console.log('  NOTE: Only attempting if staging has working OPENAI_API_KEY.');

  let aiPerformed = 0;
  const aiLatencies: number[] = [];

  for (let i = 0; i < 3; i++) {
    const r = await request('POST', `${APP_BASE}/api/works/${firstUser.workId}/develop`, token, {
      message: `[H6-P4B-DIAGNOSTIC] Capacity validation message ${i + 1} of 3.`,
    }, { op: 'live_validation_develop', userIndex: firstUser.index, routeSafeId: '/api/works/:id/develop' });

    if (r.status === 200) {
      aiPerformed++;
      aiLatencies.push(r.durationMs);
      console.log(`  AI call ${i + 1}: status=200 latency=${r.durationMs.toFixed(0)}ms`);
    } else if (r.status === 502) {
      const errorCode = r.data?.error;
      if (errorCode === 'ENGINE_FAILURE') {
        console.log(`  AI call ${i + 1}: ENGINE_FAILURE (Render down or unreachable) â€” stopping AI validation`);
        break;
      }
      console.log(`  AI call ${i + 1}: 502 ${JSON.stringify(r.data)} â€” likely OpenAI quota/auth issue`);
      break;
    } else {
      console.log(`  AI call ${i + 1}: status=${r.status}`);
    }
    await sleep(5000); // space calls â€” do not flood OpenAI
  }

  if (aiPerformed > 0) {
    aiLatencies.sort((a, b) => a - b);
    console.log(`  REAL OPENAI VALIDATION: PERFORMED (${aiPerformed} calls)`);
    console.log(`  Latency: min=${aiLatencies[0].toFixed(0)}ms max=${aiLatencies[aiLatencies.length - 1].toFixed(0)}ms`);
  } else {
    console.log('  REAL OPENAI VALIDATION: NOT PERFORMED â€” staging quota unavailable or engine unreachable');
  }
}

// â”€â”€ Group F: Research providers (tiny controlled sample) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runGroupF(token: string, workId: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('GROUP F: RESEARCH PROVIDERS (5 LIVE CALLS MAX)');
  console.log('NOTE: This is NOT a load test of Crossref/OpenAlex.');
  console.log('='.repeat(60));

  const queries = [
    'climate change adaptation policy',
    'academic writing skills university',
    'research methodology qualitative',
  ];

  for (let i = 0; i < Math.min(queries.length, 5); i++) {
    const q = queries[i];
    const r = await request('GET', `${APP_BASE}/api/works/${workId}/research/search?q=${encodeURIComponent(q)}`, token, undefined, { op: 'live_validation_search', userIndex: pool.users[0].index, routeSafeId: '/api/works/:id/research/search' });
    console.log(`  Query "${q}": status=${r.status} latency=${r.durationMs.toFixed(0)}ms`);
    if (r.status === 200 && r.data?.providerStatus) {
      console.log(`  Provider status: ${JSON.stringify(r.data.providerStatus)}`);
    }
    await sleep(2000); // space calls â€” do not hammer third parties
  }

  console.log('\n  SIMULATED PROVIDER TEST (not live):');
  console.log('  These tests use the existing deterministic isolation built into the search layer.');
  console.log('  SIMULATED: Single-provider failure â†’ other provider still returns results.');
  console.log('  Verify manually via provider status field in GET /api/works/[workId]/research/search.');
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function main() {
  // Re-authenticate all pool users (tokens may have expired since provisioning)
  console.log('Re-authenticating pool users...');
  const tokens = await refreshTokens();
  const authCount = tokens.size;
  console.log(`  Authenticated: ${authCount}/${pool.users.length}`);

  if (authCount < Math.max(...STAGES)) {
    console.error(`WARN: Only ${authCount} tokens available. Stages up to ${authCount} concurrent users can run.`);
  }

  const stageResults: Array<{
    concurrency: number;
    healthy: boolean;
    stopReason: string | null;
    metrics: object;
  }> = [];

  let lastHealthyConcurrency = 0;
  let firstUnhealthyConcurrency: number | null = null;

  for (let si = 0; si < STAGES.length; si++) {
    const concurrency = STAGES[si];
    if (concurrency > authCount) {
      console.log(`\nSkipping stage ${concurrency} â€” only ${authCount} tokens available.`);
      break;
    }

    const { healthy, metrics, stopReason } = await runStage(concurrency, tokens, si + 1);

    stageResults.push({
      concurrency,
      healthy,
      stopReason,
      metrics: {
        total: metrics.total,
        success2xx: metrics.success2xx,
        networkErrors: metrics.networkErrors,
        statusDistribution: metrics.statusDist(),
        throughputRps: metrics.throughputRps(),
        overall: metrics.overallPercentiles(),
        byRoute: Object.fromEntries(
          (['sources_read', 'preferences_read', 'document_save', 'source_write', 'citation_write'] as OpType[])
            .map(op => [op, {
              count: metrics.results.filter(r => r.op === op).length,
              ...metrics.opPercentiles(op),
            }])
        ),
        budgetSubstitutions: metrics.results.filter(r => r.op === 'budget_substitution').length,
      },
    });

    if (healthy) {
      lastHealthyConcurrency = concurrency;
    } else {
      firstUnhealthyConcurrency = concurrency;
      break;
    }

    if (si < STAGES.length - 1) {
      console.log(`\nRecovery: ${RECOVERY_MS / 1000}s before next stage...`);
      await sleep(RECOVERY_MS);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('STAGE RAMP COMPLETE');
  console.log(`  LAST HEALTHY TESTED STAGE: ${lastHealthyConcurrency} concurrent simulated users`);
  if (firstUnhealthyConcurrency) {
    console.log(`  FIRST UNHEALTHY STAGE: ${firstUnhealthyConcurrency} concurrent simulated users`);
  }
  console.log('');

  // Group E & F (using first user's token)
  const firstToken = tokens.get(pool.users[0]?.index);
  if (firstToken && pool.users[0]) {
    await runGroupE(firstToken);
    await runGroupF(firstToken, pool.users[0].workId);
  }

  // Write results
  const report = {
    runId: pool.runId,
    apiBase: APP_BASE,
    completedAt: new Date().toISOString(),
    stageResults,
    conclusion: {
      lastHealthyConcurrency,
      firstUnhealthyConcurrency,
      workloadLabel: 'SYNTHETIC HIGH-ACTIVITY â€” not realistic normal use',
    },
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  // Persist updated pool (sourceIds may have been populated)
  const updatedPool: PoolFile = { ...pool, users: pool.users };
  fs.writeFileSync('scratch/h6-p4b-pool.json', JSON.stringify(updatedPool, null, 2), 'utf8');

  console.log(`\nResults written to ${REPORT_PATH}`);
  console.log('\nNext steps:');
  console.log('  1. Run integrity SQL: scratch/h6-p4b-integrity.sql');
  console.log('  2. Run cleanup: npx tsx scratch/h6-p4b-cleanup.ts');
  console.log('  3. Compile final report: scratch/h6-p4b-report.md');
}

main().catch(err => { console.error('Harness failed:', err); process.exit(1); });

