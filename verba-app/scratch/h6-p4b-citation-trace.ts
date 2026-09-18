import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  const raw = fs.readFileSync('.env.local', 'utf8');
  raw.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const POOL_PATH = 'scratch/h6-p4b-pool.json';
const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

async function main() {
  const u = pool.users[0];
  const cred = pool.credentials.find(c => c.index === u.index);
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: cred.email,
    password: cred.password
  });
  if (authErr) throw authErr;
  
  console.log('Authenticated UID:', authData.user.id);
  
  // 1. Check Document
  const { data: docData } = await client.from('documents').select('*').eq('id', u.documentId).single();
  console.log('\nDocument:', docData);

  // 2. Check Work
  const { data: workData } = await client.from('works').select('*').eq('id', u.workId).single();
  console.log('\nWork:', workData);

  // 3. Create a source to cite
  const { data: sourceData, error: srcErr } = await client.rpc('create_or_get_source', {
    p_work_id: u.workId,
    p_source_data: { title: 'Trace Source', publication_year: 2026, source_type: 'other', authors: [] }
  });
  if (srcErr) throw srcErr;
  console.log('\nSource:', sourceData);

  const sourceId = sourceData.id;

  // 4. Check Work Source
  const { data: checkSource } = await client.from('work_sources').select('*').eq('id', sourceId).single();
  console.log('\nVerified Source DB Row:', checkSource);

  // 5. Try inserting citation
  const { data: citeData, error: citeErr } = await client.from('document_citations').insert({
    document_id: u.documentId,
    work_source_id: sourceId,
    user_id: authData.user.id,
    locator: 'page 42'
  }).select('*');
  
  if (citeErr) {
    console.error('\nCitation Insert Error:', citeErr);
  } else {
    console.log('\nCitation Inserted:', citeData);
  }
}

main().catch(console.error);
