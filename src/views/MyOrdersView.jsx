import { useAppStore } from "../context/useAppStore.js";
import { Coffee, Clock, ChevronRight } from 'lucide-react';
import { formatRp, formatDate } from '../utils/formatters.js';

function MyOrdersView({ setView, setSelectedOrder }) {
  const { store, currentUser } = useAppStore();
  const { session, history } = store;
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

  // Collect all orders for currentUser across history and active session
  const allPersonalOrders = [];

  // Past orders from history
  history.forEach(s => {
    const myOrder = s.orders.find(o => o.userId === currentUser?.id || (o.username || '').toLowerCase() === (currentUser?.username || '').toLowerCase());
    if (myOrder) {
      allPersonalOrders.push({
        ...myOrder,
        sessionDate: s.startedAt,
        payer: s.payer,
        payerId: s.payerId,
        paymentInfo: s.paymentInfo,
        isPaid: !(s.debtors || []).some(d => (d || '').toLowerCase() === (currentUser?.username || '').toLowerCase()) && !(s.debtorIds || []).includes(currentUser?.id),
        sessionId: s.id
      });
    }
  });

  // Active session order if exists
  if (session && !sessionDone) {
    const myActiveOrder = session.orders.find(o => o.userId === currentUser?.id);
    if (myActiveOrder) {
      allPersonalOrders.push({
        ...myActiveOrder,
        sessionDate: session.startedAt,
        payer: session.payer,
        payerId: session.payerId,
        paymentInfo: session.paymentInfo,
        isPaid: myActiveOrder.isPaid || false,
        sessionId: session.id,
        isLive: true
      });
    }
  }

  const sortedOrders = [...allPersonalOrders].sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));

  return (
    <div className="orders-view fade-in session-container">
      <div className="section-header mb-6">
        <h2 className="mb-1">Pesanan Saya</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Riwayat kopi yang pernah kamu pesan.</p>
      </div>

      <div className="card-stack">
        {sortedOrders.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '4rem 2rem' }}>
            <Coffee size={64} style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem', opacity: 0.5 }} />
            <p className="text-secondary" style={{ fontWeight: 600 }}>Belum ada pesanan.</p>
          </div>
        ) : (
          sortedOrders.map((o, idx) => (
            <div 
              key={idx} 
              className={`history-card mb-3 ${o.isLive ? 'active-border' : ''}`}
              onClick={() => {
                setSelectedOrder(o);
                setView('order-detail');
              }}
            >
              <div className="history-card-header">
                <div style={{ fontSize: '1.75rem', background: 'var(--bg-primary)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                  {o.item?.emoji || '☕'}
                </div>
                <div className="history-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 800 }}>{o.item?.name}</p>
                    {o.isLive && <span className="badge-role payer" style={{ fontSize: '0.5rem', padding: '2px 6px' }}>LIVE</span>}
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '2px' }}>{formatDate(o.sessionDate)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="history-total" style={{ fontSize: '1.1rem' }}>{formatRp(o.item?.price)}</p>
                  <p style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 900, 
                    marginTop: '4px',
                    color: o.isPaid ? 'var(--success)' : 'var(--danger)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {o.isPaid ? 'LUNAS' : 'HUTANG'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyOrdersView;
