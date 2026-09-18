import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import * as crypto from 'crypto';

// Safety Constraints
if (process.env.ALLOW_STAGING_LOAD_TEST !== 'true') {
  console.error("ERROR: Safety guard failed. Set ALLOW_STAGING_LOAD_TEST=true.");
  process.exit(1);
}

const API_BASE = process.env.STAGING_API_BASE || 'http://localhost:3000/api';
const IS_PROD = API_BASE.includes('app.verba.com') || API_BASE.includes('production');
if (IS_PROD) {
  console.error("ABORT: Target appears to be production.");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: TEST_USER_PASSWORD required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STAGES = [1, 5, 10, 20, 40, 75];
const STAGE_DURATION_SEC = 60;
const WARMUP_DURATION_SEC = 10;
const RECOVERY_DURATION_SEC = 15;

interface TestUser {
  id: string;
  email: string;
  token: string;
  workId: string;
  docId: string;
  currentVersion: number;
}

const createdUsers: TestUser[] = [];
const diagnosticSourcePrefix = '[H6-P4B-DIAGNOSTIC]';

async function sendRequest(url: string, method: string, token: string, body?: any) {
  const start = performance.now();
  let status = 0;
  let retryAfter = null;
  let responseData = null;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    status = res.status;
    retryAfter = res.headers.get('Retry-After');
    if (res.ok && method !== 'DELETE') {
      try {
        responseData = await res.json();
      } catch (e) {}
    }
  } catch (err: any) {
    status = 0; // Network error
  }
  return { status, duration: performance.now() - start, retryAfter, responseData };
}

async function provisionUsers(count: number) {
  console.log(`\n--- PROVISIONING ${count} TEST USERS ---`);
  for (let i = 0; i < count; i++) {
    const email = `h6_p4b_${Date.now()}_${i}@verba.test`;
    const { data: auth, error: authErr } = await supabase.auth.signUp({ email, password: TEST_PASSWORD });
    if (authErr || !auth.session) {
      console.error(`Failed to provision user ${i}:`, authErr?.message);
      process.exit(1);
    }
    const token = auth.session.access_token;
    const userId = auth.user!.id;

    const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: work, error: wErr } = await sbUser.from('works')
      .insert({ title: `Capacity Work ${userId}`, user_id: userId })
      .select('id').single();
      
    if (wErr || !work) {
      console.error("Failed to create work:", wErr?.message);
      process.exit(1);
    }

    const { data: doc, error: dErr } = await sbUser.from('documents')
      .insert({ work_id: work.id, title: `Capacity Doc ${userId}`, user_id: userId, original_filename: 'load.pdf', storage_path: 'test/load.pdf' })
      .select('id').single();

    if (dErr || !doc) {
      console.error("Failed to create doc:", dErr?.message);
      process.exit(1);
    }

    createdUsers.push({ id: userId, email, token, workId: work.id, docId: doc.id, currentVersion: 1 });
  }
  console.log(`Provisioning complete. ${createdUsers.length} users ready.`);
}

async function cleanup() {
  console.log(`\n--- CLEANUP ---`);
  for (const u of createdUsers) {
    const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${u.token}` } }
    });
    await sbUser.from('work_sources').delete().like('title', `${diagnosticSourcePrefix}%`);
    await sbUser.from('documents').delete().eq('id', u.docId);
    await sbUser.from('works').delete().eq('id', u.workId);
  }
  console.log(`Removed documents, works, and diagnostic sources for ${createdUsers.length} users.`);
  console.log("NOTE: Test accounts in auth.users were NOT deleted (requires service_role).");
  console.log("Test accounts use prefix: h6_p4b_*@verba.test");
}

class Metrics {
  durations: number[] = [];
  statusCounts: Record<number, number> = {};
  networkErrors = 0;
  routeLatencies: Record<string, number[]> = {};

  add(route: string, status: number, duration: number) {
    if (status === 0) {
      this.networkErrors++;
    } else {
      this.statusCounts[status] = (this.statusCounts[status] || 0) + 1;
      this.durations.push(duration);
      if (!this.routeLatencies[route]) this.routeLatencies[route] = [];
      this.routeLatencies[route].push(duration);
    }
  }
}

function calculatePercentiles(durs: number[]) {
  if (durs.length === 0) return { min: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  durs.sort((a, b) => a - b);
  return {
    min: durs[0].toFixed(1),
    p50: durs[Math.floor(durs.length * 0.5)].toFixed(1),
    p95: durs[Math.floor(durs.length * 0.95)].toFixed(1),
    p99: durs[Math.floor(durs.length * 0.99)].toFixed(1),
    max: durs[durs.length - 1].toFixed(1)
  };
}

async function userLoop(user: TestUser, durationSec: number, metrics: Metrics | null) {
  const endTime = Date.now() + durationSec * 1000;
  while (Date.now() < endTime) {
    const rand = Math.random();
    let route = '';
    let status = 0;
    let duration = 0;

    if (rand < 0.50) {
      // 50% Document Read (Workspace load)
      route = 'read_workspace';
      const r = await sendRequest(`${API_BASE}/works/${user.workId}/context`, 'GET', user.token);
      status = r.status; duration = r.duration;
    } else if (rand < 0.70) {
      // 20% Save (Properly incrementing version)
      route = 'save_doc';
      const r = await sendRequest(`${API_BASE}/documents/${user.docId}/save`, 'POST', user.token, {
        expectedVersion: user.currentVersion,
        editorState: { type: 'doc', content: [{ type: 'text', text: `SAVE_${Date.now()}` }] }
      });
      status = r.status; duration = r.duration;
      if (r.status === 200 && r.responseData && r.responseData.version) {
        user.currentVersion = r.responseData.version;
      } else if (r.status === 409) {
        // Optimistic concurrency failure, fetch latest version?
        // Let's just simulate the client refetching state, but for load test we can just increment to avoid stalling
        user.currentVersion++; 
      }
    } else if (rand < 0.85) {
      // 15% Source Operations
      route = 'add_source';
      const sourceId = crypto.randomBytes(4).toString('hex');
      const r = await sendRequest(`${API_BASE}/works/${user.workId}/sources`, 'POST', user.token, {
        source_type: 'book',
        title: `${diagnosticSourcePrefix} Source ${sourceId}`,
        authors: [{ name: 'Test Author' }],
        publication_year: 2026,
        url: `https://example.com/${sourceId}`
      });
      status = r.status; duration = r.duration;
    } else if (rand < 0.95) {
      // 10% Citation Reads
      route = 'read_citations';
      const r = await sendRequest(`${API_BASE}/documents/${user.docId}/citations`, 'GET', user.token);
      status = r.status; duration = r.duration;
    } else {
      // 5% State/Preferences
      route = 'read_prefs';
      const r = await sendRequest(`${API_BASE}/preferences`, 'GET', user.token);
      status = r.status; duration = r.duration;
    }

    if (metrics) metrics.add(route, status, duration);
    
    // Pace requests to approx 1.5s per user (40/min) to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function runStage(concurrency: number) {
  console.log(`\n=================================================`);
  console.log(`STAGE: ${concurrency} CONCURRENT USERS`);
  console.log(`=================================================`);
  
  const activeUsers = createdUsers.slice(0, concurrency);
  
  // Warmup
  console.log(`Warming up for ${WARMUP_DURATION_SEC}s...`);
  await Promise.all(activeUsers.map(u => userLoop(u, WARMUP_DURATION_SEC, null)));

  // Measurement
  console.log(`Measuring for ${STAGE_DURATION_SEC}s...`);
  const metrics = new Metrics();
  await Promise.all(activeUsers.map(u => userLoop(u, STAGE_DURATION_SEC, metrics)));

  // Reporting
  const total = metrics.durations.length + metrics.networkErrors;
  const success = Object.entries(metrics.statusCounts).filter(([k]) => k.startsWith('2')).reduce((acc, [_, v]) => acc + v, 0);
  const throughput = (total / STAGE_DURATION_SEC).toFixed(2);
  
  console.log(`\nResults for ${concurrency} users:`);
  console.log(`Total Requests: ${total} | Success: ${success} | Throughput: ${throughput} req/s`);
  console.log(`Status Distribution:`, metrics.statusCounts);
  console.log(`Network Errors: ${metrics.networkErrors}`);
  
  const overall = calculatePercentiles(metrics.durations);
  console.log(`Overall Latency (ms): min ${overall.min} | p50 ${overall.p50} | p95 ${overall.p95} | p99 ${overall.p99} | max ${overall.max}`);
  
  console.log(`Route Latency (p95 ms):`);
  for (const [route, durs] of Object.entries(metrics.routeLatencies)) {
    console.log(`  ${route}: ${calculatePercentiles(durs).p95}`);
  }

  // Stop Conditions Check
  const total5xx = Object.entries(metrics.statusCounts)
    .filter(([k]) => k.startsWith('5'))
    .reduce((acc, [_, v]) => acc + v, 0);
  
  if (total5xx / total > 0.01) {
    console.error(`\nSTOP CONDITION MET: > 1% 5xx errors.`);
    return false;
  }
  if (parseFloat(overall.p95) > 3000) {
    console.error(`\nSTOP CONDITION MET: Overall p95 > 3s (${overall.p95}ms)`);
    return false;
  }
  if (parseFloat(overall.p99) > 5000) {
    console.error(`\nSTOP CONDITION MET: Overall p99 > 5s (${overall.p99}ms)`);
    return false;
  }

  return true;
}

async function runGroupEandF() {
  console.log(`\n=================================================`);
  console.log(`GROUP E & F: TINY LIVE VALIDATION (RENDER & PROVIDERS)`);
  console.log(`=================================================`);
  
  const user = createdUsers[0];
  if (!user) return;

  // Render / FastAPI (Research/Search path)
  console.log("Validating Render/OpenAI path (Search)...");
  const r1 = await sendRequest(`${API_BASE}/works/${user.workId}/research/search`, 'POST', user.token, {
    query: 'climate change impacts',
    type: 'semantic'
  });
  console.log(`Render Search Status: ${r1.status}, Latency: ${r1.duration.toFixed(1)}ms`);

  // Provider Validation (OpenAlex DOI)
  console.log("Validating External Provider path (OpenAlex DOI)...");
  const r2 = await sendRequest(`${API_BASE}/works/${user.workId}/research/doi`, 'POST', user.token, {
    doi: '10.1038/s41586-020-2012-7'
  });
  console.log(`Provider DOI Status: ${r2.status}, Latency: ${r2.duration.toFixed(1)}ms`);
}

async function main() {
  try {
    await provisionUsers(75);
    
    let lastHealthy = 0;
    for (const concurrency of STAGES) {
      const healthy = await runStage(concurrency);
      if (!healthy) {
        console.log(`\nFIRST UNHEALTHY STAGE: ${concurrency}`);
        break;
      }
      lastHealthy = concurrency;
      console.log(`Stage ${concurrency} healthy. Cooling down for ${RECOVERY_DURATION_SEC}s...`);
      await new Promise(r => setTimeout(r, RECOVERY_DURATION_SEC * 1000));
    }
    
    console.log(`\nLAST HEALTHY TESTED STAGE: ${lastHealthy} concurrent simulated users.`);
    
    await runGroupEandF();
  } catch (err) {
    console.error(err);
  } finally {
    await cleanup();
  }
}

main();
