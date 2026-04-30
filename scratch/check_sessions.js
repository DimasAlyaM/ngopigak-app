
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkSessionData() {
  const targetId = "999a93ff-8704-4a03-8a8b-a4780bb21565";
  const { data, error } = await supabase.from('sessions').select('*').eq('id', targetId).maybeSingle();
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    console.log('Session data:', JSON.stringify(data, null, 2));
  } else {
    // Try historical
    const { data: hist, error: histErr } = await supabase.from('historic_sessions').select('*').eq('id', targetId).maybeSingle();
    if (histErr) console.error(histErr);
    console.log('Historical session data:', JSON.stringify(hist, null, 2));
  }
}

checkSessionData();
