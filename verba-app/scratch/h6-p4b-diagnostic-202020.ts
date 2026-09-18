import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import type { PoolFile } from './h6-p4b-provision';

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
const APP_BASE = (process.env.STAGING_API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request(
  method: 'GET' | 'POST',
  url: string,
  token: string,
  body?: unknown
): Promise<{ status: number; durationMs: number; data: any; networkError: boolean }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const durationMs = performance.now() - t0;
    let data: any = null;
    try { data = await res.json(); } catch (_) {}
    return { status: res.status, durationMs, data, networkError: false };
  } catch (err: any) {
    return { status: 0, durationMs: performance.now() - t0, data: null, networkError: true };
  }
}

function calcPercentiles(arr: number[]) {
  if (arr.length === 0) return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const p = (q: number) => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  };
  return {
    min: sorted[0],
    p50: p(0.50),
    p90: p(0.90),
    p95: p(0.95),
    p99: p(0.99),
    max: sorted[sorted.length - 1]
  };
}

async function main() {
  const poolRaw = fs.readFileSync('scratch/h6-p4b-pool.json', 'utf8');
  const pool: PoolFile = JSON.parse(poolRaw);
  const u = pool.users[0];
  const cred = pool.credentials.find(c => c.index === u.index)!;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let authData, error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.auth.signInWithPassword({
        email: cred.email,
        password: cred.password
      });
      authData = res.data;
      error = res.error;
      if (!error && authData?.session) break;
    } catch (err) {
      error = err;
    }
    console.log('Auth failed, retrying in 2s...');
    await sleep(2000);
  }
  if (error || !authData.session) {
    console.error('Failed to auth user:', error);
    process.exit(1);
  }
  const token = authData.session.access_token;

  console.log(`Authenticated user ${u.index}. Starting 10s warmup...`);
  const warmStart = Date.now();
  while (Date.now() - warmStart < 10000) {
    await request('GET', `${APP_BASE}/preferences`, token);
    await request('GET', `${APP_BASE}/works/${u.workId}/sources`, token);
    await sleep(500);
  }
  
  // Re-fetch current version
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: docData } = await authedClient
    .from('documents')
    .select('editor_version')
    .eq('id', u.documentId)
    .single();
  let currentVersion = docData?.editor_version || u.currentVersion;

  console.log(`Warmup complete. Current version: ${currentVersion}`);
  console.log('Running diagnostic...');

  const results: Record<string, { latencies: number[]; statusDist: Record<number, number>; over3: number[]; over5: number[] }> = {
    'sources_read': { latencies: [], statusDist: {}, over3: [], over5: [] },
    'preferences_read': { latencies: [], statusDist: {}, over3: [], over5: [] },
    'document_save': { latencies: [], statusDist: {}, over3: [], over5: [] }
  };

  const addResult = (route: string, res: { status: number, durationMs: number }) => {
    const lat = Math.round(res.durationMs);
    results[route].latencies.push(lat);
    results[route].statusDist[res.status] = (results[route].statusDist[res.status] || 0) + 1;
    if (lat > 3000) results[route].over3.push(lat);
    if (lat > 5000) results[route].over5.push(lat);
  };

  // 1. sources_read
  for (let i = 0; i < 20; i++) {
    const r = await request('GET', `${APP_BASE}/works/${u.workId}/sources`, token);
    addResult('sources_read', r);
    await sleep(200);
  }

  // 2. preferences_read
  for (let i = 0; i < 20; i++) {
    const r = await request('GET', `${APP_BASE}/preferences`, token);
    addResult('preferences_read', r);
    await sleep(200);
  }

  // 3. document_save
  // Rate limit: 25 per 10 seconds. We'll do 20 saves, spaced by 500ms (10 seconds total).
  // This will stay exactly under 25 per 10s.
  for (let i = 0; i < 20; i++) {
    const r = await request('POST', `${APP_BASE}/documents/${u.documentId}/save`, token, {
      editorState: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Diagnostic save ${i}` }] }] },
      wordCount: 3,
      expectedVersion: currentVersion,
      saveType: 'autosave'
    });
    
    addResult('document_save', r);
    
    if (r.status === 200 && r.data?.newVersion) {
      currentVersion = r.data.newVersion;
    } else if (r.status === 429) {
      console.log('Rate limited! Waiting 10s...');
      await sleep(10000);
      i--; // retry this iteration
      continue;
    } else if (r.status === 409) {
       currentVersion = r.data?.currentVersion;
       i--; // retry this iteration
       continue;
    }
    
    await sleep(500);
  }

  console.log('\n--- DIAGNOSTIC RESULTS ---');
  for (const [route, data] of Object.entries(results)) {
    console.log(`\nROUTE: ${route}`);
    console.log(`n = ${data.latencies.length}`);
    const successCount = data.statusDist[200] || 0;
    console.log(`success count = ${successCount}`);
    console.log(`status distribution = ${JSON.stringify(data.statusDist)}`);
    const p = calcPercentiles(data.latencies);
    console.log(`min: ${Math.round(p.min)}ms`);
    console.log(`median/p50: ${Math.round(p.p50)}ms`);
    console.log(`p90: ${Math.round(p.p90)}ms`);
    console.log(`p95: ${Math.round(p.p95)}ms`);
    console.log(`p99: ${Math.round(p.p99)}ms`);
    console.log(`max: ${Math.round(p.max)}ms`);
    console.log(`count > 3 seconds: ${data.over3.length}`);
    console.log(`count > 5 seconds: ${data.over5.length}`);
    if (data.over3.length > 0) {
      console.log(`Latencies > 3s: ${data.over3.join(', ')}`);
    }
  }
}

main().catch(console.error);
