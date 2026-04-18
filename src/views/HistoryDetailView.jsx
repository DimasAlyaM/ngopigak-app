import { useAppContext } from '../context/AppContext.jsx';

/**
 * HistoryDetailView Component 
 * Shows details of a specific session from history.
 */
function HistoryDetailView({ session, onBack, setPreviewProof, setView, setSelectedOrder }) {
  const { currentUser, api } = useAppContext();
  if (!session) return null;

  const orders = Array.isArray(session?.orders) ? session.orders : [];
  const totalSession = orders.reduce((sum, o) => sum + (o.item?.price || 0), 0);

  return (
    <div className="history-detail-view fade-in" style={{ padding: '1rem' }}>
      <div className="detail-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
        <button className="glass-panel" style={{ padding: '8px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-gradient">Detail Sesi</h2>
      </div>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '32px', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Tanggal Sesi</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatDate(session.startedAt)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Total Putaran</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatRp(totalSession)}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '20px' }}>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>PEMBAYAR UTAMA</span>
            <p style={{ fontWeight: 800 }}>{session.payer}</p>
          </div>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>PENDAMPING</span>
            <p style={{ fontWeight: 800 }}>{session.companion || '-'}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', paddingLeft: '4px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daftar Pesanan ({orders.length})</h4>
      </div>

      <div className="card-stack" style={{ marginBottom: '2rem' }}>
        {orders.map((o, idx) => {
          const orderDebt = session.debtorIds 
            ? session.debtorIds.includes(o.userId) 
            : session.debtors?.some(d => (d || '').toLowerCase() === (o.username || '').toLowerCase());
          return (
            <div 
              key={idx} 
              className="item-card glass-panel" 
              style={{ padding: '12px 16px', borderRadius: '24px', cursor: 'pointer' }}
              onClick={() => {
                setSelectedOrder({
                  ...o,
                  sessionDate: session.startedAt,
                  payer: session.payer,
                  payerId: session.payerId,
                  isPaid: !orderDebt,
                  sessionId: session.id
                });
                setView('order-detail');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserAvatar username={o.username} size={36} />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item.name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatRp(o.item.price)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  {o.paymentProof && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewProof({ url: o.paymentProof, username: o.username, userId: o.userId });
                      }}
                      style={{ cursor: 'pointer', padding: '2px' }}
                    >
                      <Camera size={12} className="text-accent" />
                    </div>
                  )}
                  {o.userId !== session.payerId ? (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: orderDebt ? '#ef4444' : '#4ade80' }}>
                      {orderDebt ? 'HUTANG' : 'LUNAS'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, color: '#4ade80' }}>
                      PAYER
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HistoryDetailView;
