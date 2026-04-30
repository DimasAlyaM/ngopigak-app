
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

async function checkAllSessions() {
  const { data, error } = await supabase.from('sessions').select('id, status, payer, payment_method, account_no');
  if (error) {
    console.error(error);
    return;
  }
  console.log('Sessions:', JSON.stringify(data, null, 2));
}

checkAllSessions();
