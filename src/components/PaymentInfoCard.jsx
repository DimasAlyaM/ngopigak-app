import React from 'react';
import { Copy, Wallet, Building2, CheckCircle2 } from 'lucide-react';

/**
 * PaymentInfoCard Component
 * Displays payment transfer details (Bank/E-wallet, account number) with premium UI.
 */
function PaymentInfoCard({ info, payer, companion }) {
  const [copied, setCopied] = React.useState(false);

  if (!info) return null;

  const paymentMethod = info.method || info.payment_method || info.paymentMethod;
  const isBank = paymentMethod?.toLowerCase() === 'bank';
  const MethodIcon = isBank ? Building2 : Wallet;

  const handleCopy = () => {
    const acNo = info.accountNo || info.account_no || info.accountNumber;
    navigator.clipboard.writeText(acNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="payment-info-card fade-in" style={{
      background: 'linear-gradient(160deg, #1f1a16 0%, #0f0c0a 100%)',
      borderRadius: '24px',
      border: '1px solid rgba(230, 145, 56, 0.15)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Decorative top accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-light))'
      }} />

      <div style={{ padding: '1.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Transfer ke {payer}
            </p>
            {companion && (
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Pendamping: {companion}
              </p>
            )}
          </div>
          <div style={{
            background: 'rgba(230, 145, 56, 0.1)',
            border: '1px solid rgba(230, 145, 56, 0.2)',
            padding: '6px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <MethodIcon size={14} className="text-accent" />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-light)' }}>
              {paymentMethod}
            </span>
          </div>
        </div>

        <div style={{ 
          background: 'rgba(0,0,0,0.4)', 
          padding: '1.25rem', 
          borderRadius: '16px', 
          border: '1px solid rgba(255,255,255,0.03)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.35rem', letterSpacing: '1px', margin: 0, color: '#fff' }}>
              {info.accountNo || info.account_no || info.accountNumber}
            </p>
            <p className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '4px' }}>
              {info.bankName || info.bank_name || 'Digital Wallet'}
            </p>
          </div>
          <button 
            onClick={handleCopy}
            style={{ 
              background: copied ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: copied ? 'var(--success)' : 'white'
            }}
          >
            {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
          </button>
        </div>

        <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '1.25rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span>💡</span> Pastikan nominal transfer sesuai total pesanan.
        </p>
      </div>
    </div>
  );
}

export default PaymentInfoCard;
