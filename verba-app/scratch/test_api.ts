import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      value = value.replace(/(^['"]|['"]$)/g, '').trim();
      process.env[key] = value;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = 'testa@verba.test';
  const password = 'password123';
  let { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  
  const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth.session!.access_token}` } }
  });

  const { data: work } = await sbAuth.from('works').select('id').limit(1).single();
  
  console.log(`\n--- API Request ---`);
  const API_BASE = 'http://localhost:3000/api';
  try {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/works/${work?.id}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.session!.access_token}` },
      body: JSON.stringify({ 
        source_type: 'book', 
        title: `Diagnostic Book ${Date.now()}`, 
        publication_year: 2026,
        authors: []
      })
    });
    console.log(`API Status: ${res.status} (${Date.now() - start}ms)`);
    const bodyText = await res.text();
    console.log(`API Body:`, bodyText);
  } catch(e: any) {
    console.log(`API Fetch Error:`, e.message);
  }
}
run();
