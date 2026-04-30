
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

async function findDalgonaHist() {
  const { data, error } = await supabase.from('historic_sessions').select('*');
  if (error) {
    console.error(error);
    return;
  }
  const session = data.find(h => h.data.orders.some(o => o.item.name.toLowerCase().includes('dalgona')));
  console.log('Session with dalgona:', JSON.stringify(session, null, 2));
}

findDalgonaHist();
