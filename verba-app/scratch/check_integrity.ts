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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

async function check() {
  const email = 'testa@verba.test';
  const password = process.env.TEST_USER_PASSWORD;
  const { data: auth } = await supabase.auth.signInWithPassword({ email, password });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${auth.session!.access_token}` } }
  });

  // check for orphaned sources/locations/identifiers
  const { data: orphansIds } = await sb.from('source_identifiers').select('id, source_id').is('source_id', null);
  const { data: orphansLocs } = await sb.from('source_locations').select('id, source_id').is('source_id', null);

  // check for 10.5555 leftovers
  const { data: leftovers } = await sb.from('work_sources').select('id').like('doi', '10.5555/%');

  console.log(`Orphan Identifiers: ${orphansIds?.length}`);
  console.log(`Orphan Locations: ${orphansLocs?.length}`);
  console.log(`Leftover 10.5555 records: ${leftovers?.length}`);
}

check();
