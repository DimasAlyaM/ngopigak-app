
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

async function checkLiveSessions() {
  const { data, error } = await supabase.from('sessions').select('*').in('status', ['open', 'active', 'payment-setup', 'bought']);
  if (error) {
    console.error(error);
    return;
  }
  console.log('Live Sessions:', JSON.stringify(data, null, 2));
}

checkLiveSessions();
