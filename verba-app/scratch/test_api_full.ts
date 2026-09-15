import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = 'testa@verba.test';
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) throw new Error("TEST_USER_PASSWORD is required");
  let { data: auth } = await supabase.auth.signInWithPassword({ email, password });
  
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
        authors: [],
        identifiers: [
          {
            identifier_type: "doi",
            identifier_value: "10.1234/test",
            normalized_value: "10.1234/test",
            is_primary: true
          }
        ],
        locations: [
          {
            location_type: "url",
            url: "https://example.com",
            is_best: true,
            is_primary: true,
            content_type: "text/html",
            access_status: "open"
          }
        ]
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
