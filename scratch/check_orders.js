
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

async function checkOrders() {
  const { data, error } = await supabase.from('orders').select('*').ilike('coffee_name', '%dalgona%');
  if (error) {
    console.error(error);
    return;
  }
  console.log('Orders with dalgona:', JSON.stringify(data, null, 2));
}

checkOrders();
