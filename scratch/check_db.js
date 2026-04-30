
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually since dotenv might not be installed in node_modules (it's not in package.json)
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkSessions() {
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }
  console.log('--- ACTIVE SESSIONS ---');
  data.forEach(s => {
    console.log(`ID: ${s.id} | Status: ${s.status} | Payer: ${s.payer} | PaymentInfo: ${s.payment_method ? 'YES' : 'NO'}`);
    if (s.payment_method) console.log(`  -> ${s.payment_method} | ${s.bank_name} | ${s.account_no}`);
  });

  const { data: historic, error: hError } = await supabase.from('historic_sessions').select('*').order('created_at', { ascending: false }).limit(3);
  if (hError) {
    console.error('Error fetching history:', hError);
  } else {
    console.log('\n--- RECENT HISTORY ---');
    historic.forEach(h => {
      const d = h.data;
      console.log(`ID: ${h.id} | Payer: ${d.payer} | PaymentInfo: ${d.paymentInfo ? 'YES' : 'NO'}`);
      if (d.paymentInfo) console.log(`  -> ${d.paymentInfo.method} | ${d.paymentInfo.bankName} | ${d.paymentInfo.accountNo}`);
    });
  }
}

checkSessions();
