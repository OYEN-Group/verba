const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data: sources, error: sErr } = await supabase.from('work_sources').select('id, title, doi').eq('title', 'ISBN Book');
  console.log("SOURCES:", JSON.stringify(sources, null, 2));

  const { data: ids, error: idErr } = await supabase.from('source_identifiers').select('*');
  console.log("IDENTIFIERS:", JSON.stringify(ids, null, 2));
})();
