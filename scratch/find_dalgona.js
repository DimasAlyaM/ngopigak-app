
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

async function findDalgona() {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error(error);
    return;
  }
  const dalgona = data.find(o => o.coffee_name.toLowerCase().includes('dalgona'));
  console.log('Dalgona order:', JSON.stringify(dalgona, null, 2));
}

findDalgona();
