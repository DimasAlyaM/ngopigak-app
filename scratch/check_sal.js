
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

async function checkSpecificHistory() {
  const { data, error } = await supabase.from('historic_sessions').select('*').eq('id', '5dbc9c65-c089-40a2-a760-63b640afe392').single();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('PaymentInfo:', JSON.stringify(data.data.paymentInfo, null, 2));
  console.log('Raw data keys:', Object.keys(data.data));
}

checkSpecificHistory();
