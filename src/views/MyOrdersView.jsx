import { useAppStore } from "../context/useAppStore.js";
import { api } from "../store.js";
import { Coffee, Clock } from 'lucide-react';
import { formatRp, formatDate } from '../utils/formatters.js';

function MyOrdersView({ setView, setSelectedOrder }) {
  const { store, currentUser } = useAppStore();
  const { session, history } = store;
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

  // Collect all orders for currentUser across history and active session
  const allPersonalOrders = [];

  // Past orders from history
  history.forEach(s => {
    const myOrder = s.orders.find(o => o.userId === currentUser?.id || o.username === currentUser?.username);
    if (myOrder) {
      allPersonalOrders.push({
        ...myOrder,
        sessionDate: s.startedAt,
        payer: s.payer,
        payerId: s.payerId,
        isPaid: !(s.debtors || []).includes(currentUser?.username) && !(s.debtorIds || []).includes(currentUser?.id),
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
        isPaid: myActiveOrder.isPaid || false,
        sessionId: session.id,
        isLive: true
      });
    }
  }

  return (
    <div className="orders-view fade-in" style={{ padding: '1rem' }}>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="text-gradient">My Order</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Daftar kopi yang pernah kamu pesan.</p>
      </div>

      <div className="card-stack">
        {allPersonalOrders.length === 0 ? (
          <div className="glass-panel empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Coffee size={48} className="text-secondary opacity-20 mb-4" />
            <p className="text-secondary">Belum ada pesanan.</p>
          </div>
        ) : (
          [...allPersonalOrders].reverse().map((o, idx) => (
            <div 
              key={idx} 
              className={`item-card glass-panel ${o.isLive ? 'live-order' : ''}`}
              style={{ padding: '16px', borderRadius: '24px', cursor: 'pointer' }}
              onClick={() => {
                setSelectedOrder(o);
                setView('order-detail');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ fontSize: '2rem', background: 'var(--bg-primary)', width: '60px', height: '60px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {o.item?.emoji || '☕'}
                </div>
                <div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{o.item?.name}</p>
                  <p className="text-secondary" style={{ fontSize: '0.75rem' }}>{formatDate(o.sessionDate)}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>{formatRp(o.item?.price)}</p>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: o.isPaid ? '#4ade80' : '#ef4444' }}>
                  {o.isPaid ? 'LUNAS' : 'HUTANG'}
                </span>
                {o.isLive && <div className="live-tag">Active</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyOrdersView;
