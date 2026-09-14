import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {} as any);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: sources, error: e1 } = await supabase.from('work_sources').select('*').limit(1);
  if (sources && sources.length > 0) {
    console.log('work_sources schema keys:', Object.keys(sources[0]));
  } else {
    console.log('work_sources schema (no rows):', sources, e1);
    // Let's try to query just one column to see if it exists, or insert to get an error
    const { error: e2 } = await supabase.from('work_sources').insert({}).select('*');
    console.log('Insert error showing schema:', e2);
  }
}
check();
