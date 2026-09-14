import * as fs from 'fs';

async function run() {
  console.log("Fetching Supabase...");
  try {
    const res = await fetch('https://poaclxtaacguolfeefcd.supabase.co/rest/v1/', { method: 'GET' });
    console.log(res.status);
  } catch(e: any) {
    console.error("Fetch failed:", e);
  }
}
run();
