const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('claim_source_evidence').insert({ claim_id: 'c274ac6b-8d98-456b-9fd9-f57fd841fd40', source_id: 'c274ac6b-8d98-456b-9fd9-f57fd841fd40', user_id: 'c274ac6b-8d98-456b-9fd9-f57fd841fd40' });
  console.log("ERROR:", JSON.stringify(error, null, 2));
})();
