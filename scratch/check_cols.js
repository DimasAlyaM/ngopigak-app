
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

async function checkColumns() {
  const { data, error } = await supabase.from('sessions').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data.length > 0) {
    console.log('Columns in sessions table:', Object.keys(data[0]));
  } else {
    console.log('No data in sessions table to check columns.');
  }
}

checkColumns();
