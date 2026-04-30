import React from 'react';

/**
 * PaymentInfoCard Component
 * Displays payment transfer details (Bank/E-wallet, account number).
 */
function PaymentInfoCard({ info, payer, companion }) {
  if (!info) return null;

  return (
    <div className="payment-info-card glass-panel-premium fade-in" style={{
      background: 'linear-gradient(145deg, rgba(230, 145, 56, 0.1) 0%, rgba(20, 20, 20, 0.4) 100%)',
      padding: '1.5rem',
      borderRadius: '28px',
      border: '1px solid rgba(230, 145, 56, 0.3)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative pulse element */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        background: 'var(--accent-primary)',
        filter: 'blur(60px)',
        opacity: 0.2,
        zIndex: 0
      }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Transfer ke {payer}</p>
            {companion && <p className="text-secondary" style={{ fontSize: '0.65rem', opacity: 0.7, margin: 0 }}>Pendamping: {companion}</p>}
          </div>
          <div style={{
            background: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: '10px',
            fontSize: '0.65rem',
            fontWeight: 900,
            color: 'white',
            boxShadow: '0 4px 12px rgba(230, 145, 56, 0.3)'
          }}>
            {info.method}
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '2px', margin: 0, color: 'white' }}>{info.accountNo || info.account_no}</p>
              <p className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>{info.bankName || 'Digital Wallet'}</p>
            </div>
            <button 
              className="btn-primary-pill" 
              style={{ padding: '0 16px', height: '36px', width: 'auto', fontSize: '0.75rem', borderRadius: '14px' }}
              onClick={() => {
                const acNo = info.accountNo || info.account_no;
                navigator.clipboard.writeText(acNo);
                alert('Nomor disalin!');
              }}
            >
              Salin
            </button>
          </div>
        </div>

        <p className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>
          Pastikan nominal transfer sesuai dengan total pesanan Anda.
        </p>
      </div>
    </div>
  );
}

export default PaymentInfoCard;
