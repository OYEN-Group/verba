import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
  const oldPassword = 'password123';
  
  // 1. Authenticate with old password
  let { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (authErr) {
    console.error("Failed to authenticate with old password:", authErr.message);
    process.exit(1);
  }
  
  console.log("Successfully authenticated with old password. Proceeding to rotate...");
  
  // 2. Generate new password
  const newPassword = crypto.randomBytes(32).toString('hex');
  
  // 3. Update password
  const { error: updateErr } = await supabase.auth.updateUser({ 
    password: newPassword, 
    current_password: oldPassword 
  });
  if (updateErr) {
    console.error("Failed to update password:", updateErr.message);
    process.exit(1);
  }
  
  console.log("Password updated successfully.");
  
  // 4. Verify old password fails
  const { error: verifyOldErr } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (!verifyOldErr) {
    console.error("Old password still works! Something went wrong.");
    process.exit(1);
  } else {
    console.log("Verified old password no longer works.");
  }
  
  // 5. Verify new password works
  const { error: verifyNewErr } = await supabase.auth.signInWithPassword({ email, password: newPassword });
  if (verifyNewErr) {
    console.error("New password failed to authenticate:", verifyNewErr.message);
    process.exit(1);
  } else {
    console.log("Verified new password successfully authenticates.");
  }
  
  // 6. Update .env.local
  let envContent = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
  if (envContent.includes('TEST_USER_PASSWORD=')) {
    envContent = envContent.replace(/TEST_USER_PASSWORD=.*/g, `TEST_USER_PASSWORD=${newPassword}`);
  } else {
    envContent += `\nTEST_USER_PASSWORD=${newPassword}\n`;
  }
  fs.writeFileSync('.env.local', envContent);
  console.log("Updated .env.local with new TEST_USER_PASSWORD.");
}

run();
