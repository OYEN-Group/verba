const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.rpc('query', { sql: "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';" });
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
})();