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
const ENGINE_URL = 'https://verba-engine.onrender.com';

async function request(
  method: 'GET' | 'POST',
  url: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; durationMs: number; data: any }> {
  const t0 = performance.now();
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const durationMs = performance.now() - t0;
  let data: any = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (_) { data = text; }
  return { status: res.status, durationMs, data };
}

async function main() {
  console.log('--- TASK 4: Diagnose ENGINE_FAILURE ---');
  const poolRaw = fs.readFileSync('scratch/h6-p4b-pool.json', 'utf8');
  const pool: PoolFile = JSON.parse(poolRaw);
  const u = pool.users[0];
  const cred = pool.credentials.find(c => c.index === u.index)!;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error } = await client.auth.signInWithPassword({
    email: cred.email,
    password: cred.password
  });
  if (error || !authData.session) {
    console.error('Failed to auth user:', error);
    process.exit(1);
  }
  const token = authData.session.access_token;
  
  const messageContent = '[H6-P4B-DIAGNOSTIC] Engine failure diagnosis request.';

  console.log('\n1. Testing Next.js Vercel Endpoint (POST /api/works/:id/develop)');
  const nextjsRes = await request('POST', `${APP_BASE}/works/${u.workId}/develop`, token, {
    message: messageContent
  });
  console.log(`Status: ${nextjsRes.status}`);
  console.log(`Latency: ${Math.round(nextjsRes.durationMs)}ms`);
  console.log(`Response: ${JSON.stringify(nextjsRes.data).substring(0, 500)}`);
  
  console.log('\n2. Testing Render Engine Directly (POST /api/develop)');
  const enginePayload = {
    work_id: u.workId,
    initial_idea: 'test',
    current_context: {},
    recent_messages: [{ role: 'user', content: messageContent }],
    message: messageContent
  };
  
  const engineRes = await request('POST', `${ENGINE_URL}/api/develop`, undefined, enginePayload);
  console.log(`Status: ${engineRes.status}`);
  console.log(`Latency: ${Math.round(engineRes.durationMs)}ms`);
  console.log(`Response: ${JSON.stringify(engineRes.data).substring(0, 500)}`);
}

main().catch(console.error);
