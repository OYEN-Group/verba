const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = process.env.TEST_USER_A_EMAIL || 'testa@verba.test';
  const pass = process.env.TEST_USER_A_PASSWORD || 'password123';
  
  let { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (authErr) {
     const up = await supabase.auth.signUp({ email, password: pass });
     auth = up.data;
  }
  
  const token = auth.session.access_token;
  const user = auth.user;
  
  // create a work
  let { data: work } = await supabase.from('works').insert({ title: 'Test Work', user_id: user.id }).select('id').single();
  if (!work) {
     const { data: w } = await supabase.from('works').select('id').eq('user_id', user.id).limit(1).single();
     work = w;
  }
  const workId = work.id;
  
  // call create_or_get_source via RPC
  const sourceData = {
     title: 'A Test Source',
     publication_year: 2026,
     source_type: 'book',
     identifiers: []
  };
  
  const sbAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
  });
  
  const { data, error } = await sbAuth.rpc('create_or_get_source', {
      p_work_id: workId,
      p_source_data: sourceData
  });
  
  console.log("RPC ERROR:", error);
  console.log("RPC DATA:", data);
}

run().catch(console.error);
