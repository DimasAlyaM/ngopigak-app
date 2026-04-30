
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

async function testPaymentUpdate() {
  const sessionId = 'test-' + Date.now();
  console.log('Creating test session:', sessionId);
  
  await supabase.from('sessions').insert({
    id: sessionId,
    status: 'payment-setup',
    payer: 'TestPayer',
    started_at: new Date().toISOString()
  });

  console.log('Updating payment info...');
  const { error } = await supabase.from('sessions').update({
    status: 'active',
    payment_method: 'BANK',
    bank_name: 'BCA',
    account_no: '123456789'
  }).eq('id', sessionId);

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update success!');
    const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    console.log('Result in DB:', JSON.stringify(data, null, 2));
  }

  // Cleanup
  await supabase.from('sessions').delete().eq('id', sessionId);
}

testPaymentUpdate();
