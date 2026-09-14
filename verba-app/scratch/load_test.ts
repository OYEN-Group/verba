import * as fs from 'fs';
import { performance } from 'perf_hooks';

// Ensure safety constraints
if (process.env.ALLOW_STAGING_LOAD_TEST !== 'true') {
  console.error("ERROR: Safety guard failed. Set ALLOW_STAGING_LOAD_TEST=true to run this harness.");
  process.exit(1);
}

const API_BASE = process.env.STAGING_API_BASE;
const ACCESS_TOKEN = process.env.STAGING_ACCESS_TOKEN;
const WORK_ID = process.env.TEST_WORK_ID;
const DOC_ID = process.env.TEST_DOCUMENT_ID;

if (!API_BASE || !ACCESS_TOKEN || !WORK_ID || !DOC_ID) {
  console.error("ERROR: Missing required environment variables:");
  console.error("Ensure STAGING_API_BASE, STAGING_ACCESS_TOKEN, TEST_WORK_ID, and TEST_DOCUMENT_ID are set.");
  process.exit(1);
}

if (API_BASE.includes('app.verba.com') || API_BASE.includes('production')) {
  console.error("ERROR: Target hostname appears to be production. This script must only run against staging.");
  process.exit(1);
}

console.log(`--- VERBA H6 PHASE 4A RATE-LIMITER VERIFICATION HARNESS ---`);
console.log(`Target: ${API_BASE}`);
console.log(`Work ID: ${WORK_ID}`);
console.log(`Document ID: ${DOC_ID}\n`);

// Helper for metrics
function calculateMetrics(durations: number[]) {
  if (durations.length === 0) return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  durations.sort((a, b) => a - b);
  const min = durations[0];
  const max = durations[durations.length - 1];
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  
  return {
    min: min.toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2)
  };
}

interface TestResult {
  status: number;
  duration: number;
  retryAfter: string | null;
  error?: string;
}

async function sendRequest(url: string, method: string, body: any): Promise<TestResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(body)
    });
    const duration = performance.now() - start;
    return {
      status: res.status,
      duration,
      retryAfter: res.headers.get('Retry-After')
    };
  } catch (err: any) {
    return {
      status: 0,
      duration: performance.now() - start,
      retryAfter: null,
      error: err.message
    };
  }
}

async function reportTest(name: string, results: TestResult[]) {
  console.log(`\n============================================================`);
  console.log(`RESULTS: ${name}`);
  console.log(`============================================================`);
  const statusCounts: Record<number, number> = {};
  const durations: number[] = [];
  const durations429: number[] = [];
  let networkErrors = 0;
  
  for (const r of results) {
    if (r.status === 0) networkErrors++;
    else {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      durations.push(r.duration);
      if (r.status === 429) {
        durations429.push(r.duration);
        if (!r.retryAfter) {
          console.warn(`WARNING: 429 response missing Retry-After header`);
        }
      }
    }
  }

  console.log(`Total Requests: ${results.length}`);
  console.log(`Status Distribution:`);
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  HTTP ${status}: ${count}`);
  }
  console.log(`Network Errors: ${networkErrors}`);
  
  const mAll = calculateMetrics(durations);
  console.log(`\nOverall Latency (ms):`);
  console.log(`  Min: ${mAll.min} | p50: ${mAll.p50} | p95: ${mAll.p95} | p99: ${mAll.p99} | Max: ${mAll.max}`);
  
  if (durations429.length > 0) {
    const m429 = calculateMetrics(durations429);
    console.log(`429 Rejection Latency (ms):`);
    console.log(`  Min: ${m429.min} | p50: ${m429.p50} | p95: ${m429.p95} | p99: ${m429.p99} | Max: ${m429.max}`);
  }
}

async function runHarness() {
  // We use the /sources endpoint for testing pure limits since it's cleaner for distinct sources
  
  // TEST A: DURABLE LIMITER ATOMICITY
  console.log(`\nRunning TEST A — DURABLE LIMITER ATOMICITY (via /sources distinct)...`);
  const testAPromises = Array(25).fill(0).map((_, i) => 
    sendRequest(`${API_BASE}/works/${WORK_ID}/sources`, 'POST', {
      source_type: 'journal_article',
      title: `Atomicity Test Source ${Date.now()}_${i}`,
      publication_year: 2026
    })
  );
  const resultsA = await Promise.all(testAPromises);
  await reportTest('TEST A — DURABLE LIMITER ATOMICITY (Limit 20, 25 requests)', resultsA);
  
  // Delay to allow token bucket to partially refill, or just test B now
  // For safety, test B uses /save which has its own limit (100)
  
  // TEST B: SAVE ROUTE INTEGRATION
  console.log(`\nRunning TEST B — SAVE ROUTE INTEGRATION...`);
  // 110 requests to test the 100 limit + optimistic concurrency
  const expectedVersion = Math.floor(Math.random() * 1000) + 1; // Arbitrary expected version to trigger 409s
  const testBPromises = Array(110).fill(0).map((_, i) => 
    sendRequest(`${API_BASE}/documents/${DOC_ID}/save`, 'POST', {
      expectedVersion,
      editorState: { type: 'doc', content: [{ type: 'text', text: `SAVE_BURST_${i}` }] }
    })
  );
  const resultsB = await Promise.all(testBPromises);
  await reportTest('TEST B — SAVE ROUTE INTEGRATION (110 requests)', resultsB);

  // TEST C: SOURCE ROUTE / SAME SOURCE
  // Needs to wait for the 20-token source bucket to clear, or test it knowing we might hit limits immediately.
  // Actually, let's just hammer it and observe DB deduplication vs limits.
  console.log(`\nWaiting 60 seconds for sources token bucket to refill for Test C & D...`);
  await new Promise(r => setTimeout(r, 60000));
  
  console.log(`\nRunning TEST C — SOURCE ROUTE / SAME SOURCE...`);
  const sharedDoi = `10.5555/dedupe.${Date.now()}`;
  const testCPromises = Array(25).fill(0).map(() => 
    sendRequest(`${API_BASE}/works/${WORK_ID}/sources`, 'POST', {
      source_type: 'book',
      title: 'Same Source Concurrency',
      doi: sharedDoi,
      publication_year: 2026
    })
  );
  const resultsC = await Promise.all(testCPromises);
  await reportTest('TEST C — SOURCE ROUTE / SAME SOURCE', resultsC);

  console.log(`\nWaiting 60 seconds for sources token bucket to refill for Test D...`);
  await new Promise(r => setTimeout(r, 60000));

  // TEST D: SOURCE ROUTE / DISTINCT SOURCES
  console.log(`\nRunning TEST D — SOURCE ROUTE / DISTINCT SOURCES...`);
  const testDPromises = Array(25).fill(0).map((_, i) => 
    sendRequest(`${API_BASE}/works/${WORK_ID}/sources`, 'POST', {
      source_type: 'book',
      title: `Distinct Source ${Date.now()}_${i}`,
      doi: `10.5555/distinct.${Date.now()}.${i}`,
      publication_year: 2026
    })
  );
  const resultsD = await Promise.all(testDPromises);
  await reportTest('TEST D — SOURCE ROUTE / DISTINCT SOURCES', resultsD);
  
  console.log(`\n--- LOAD TEST HARNESS COMPLETE ---`);
  console.log(`Please manually verify database integrity (editor_version, no orphan identifiers, single logical source for Test C).`);
}

runHarness().catch(err => {
  console.error("Fatal Harness Error:", err);
});
