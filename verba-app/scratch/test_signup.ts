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

async function testSignup() {
  const email = `testuser_${Date.now()}@verba.test`;
  const password = process.env.TEST_USER_PASSWORD || 'dummy';
  
  console.log(`Attempting to sign up ${email}...`);
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    console.error("Signup failed:", error.message);
  } else {
    console.log("Signup succeeded! Session:", !!data.session);
    console.log("User:", data.user?.id);
  }
}

testSignup();
