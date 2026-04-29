import { ChevronLeft, Camera, CreditCard, Users, Coffee, ChevronRight } from 'lucide-react';
import { formatDate, formatRp } from '../utils/formatters.js';
import UserAvatar from '../components/UserAvatar';

/**
 * HistoryDetailView Component 
 * Shows details of a specific session from history.
 */
function HistoryDetailView({ session, onBack, setPreviewProof, setView, setSelectedOrder }) {
  if (!session) return null;

  const orders = Array.isArray(session?.orders) ? session.orders : [];
  const totalSession = orders.reduce((sum, o) => sum + (o.item?.price || 0), 0);

  return (
    <div className="history-detail-view fade-in session-container">
      <div className="view-header mb-8" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="btn-secondary" 
          style={{ width: '44px', height: '44px', borderRadius: '14px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          onClick={onBack}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem' }}>Detail Sesi</h2>
      </div>

      {/* Main Info Card */}
      <div className="glass-panel mb-8" style={{ padding: '2rem 1.5rem', background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-primary) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <span className="text-secondary font-bold uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>Waktu Sesi</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>{formatDate(session.startedAt)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="text-secondary font-bold uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>Total Sesi</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '4px' }}>{formatRp(totalSession)}</p>
          </div>
        </div>

        <div className="grid-2">
          <div className="glass-panel p-4" style={{ background: 'rgba(230, 145, 56, 0.05)', border: '1px solid rgba(230, 145, 56, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CreditCard size={14} className="text-accent" />
              <span className="text-secondary font-bold uppercase" style={{ fontSize: '0.6rem' }}>Payer</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{session.payer}</p>
          </div>
          <div className="glass-panel p-4" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users size={14} className="text-secondary" />
              <span className="text-secondary font-bold uppercase" style={{ fontSize: '0.6rem' }}>Pendamping</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{session.companion || '-'}</p>
          </div>
        </div>
      </div>

      <div className="section-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontWeight: 800 }}>Daftar Pesanan ({orders.length})</h4>
      </div>

      <div className="card-stack mb-12">
        {orders.map((o, idx) => {
          const isPayer = session.payerId
            ? o.userId === session.payerId
            : o.username?.toLowerCase() === session.payer?.toLowerCase();
          const orderDebt = isPayer ? false : (
            session.debtorIds
              ? session.debtorIds.includes(o.userId)
              : session.debtors?.some(d => (d || '').toLowerCase() === (o.username || '').toLowerCase())
          );
          
          return (
            <div 
              key={idx} 
              className="history-card mb-3" 
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
              <div className="history-card-header">
                <div style={{ position: 'relative' }}>
                  <UserAvatar username={o.username} size={48} />
                  {o.paymentProof && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewProof({ url: o.paymentProof, username: o.username, userId: o.userId });
                      }}
                      style={{ 
                        position: 'absolute', 
                        bottom: '-2px', 
                        right: '-2px', 
                        background: 'var(--accent-primary)', 
                        padding: '4px', 
                        borderRadius: '50%', 
                        border: '2px solid var(--bg-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Camera size={10} color="white" />
                    </div>
                  )}
                </div>
                <div className="history-info">
                  <p style={{ fontSize: '1rem', fontWeight: 800 }}>{o.username}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>{o.item.name}</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <p style={{ fontWeight: 900, fontSize: '1.1rem' }}>{formatRp(o.item.price)}</p>
                    <span 
                      className={`badge-role ${isPayer ? 'payer' : (orderDebt ? 'guest' : 'companion')}`} 
                      style={{ 
                        fontSize: '0.6rem', 
                        padding: '2px 8px', 
                        marginTop: '4px',
                        display: 'inline-block',
                        background: isPayer ? 'rgba(230, 145, 56, 0.15)' : (orderDebt ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                        color: isPayer ? 'var(--accent-primary)' : (orderDebt ? 'var(--danger)' : 'var(--success)')
                      }}
                    >
                      {isPayer ? 'PAYER' : (orderDebt ? 'HUTANG' : 'LUNAS')}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-secondary" style={{ opacity: 0.3 }} />
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
