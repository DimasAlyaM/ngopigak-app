import { useAppStore } from "../context/useAppStore.js";
import { History as HistoryIcon, Calendar, Clock, ChevronRight } from 'lucide-react';
import { formatRp, formatDate } from '../utils/formatters.js';

/**
 * HistoryView Component
 */
function HistoryView({ onSelectSession }) {
  const { store, currentUser } = useAppStore();
  const { history } = store;
  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));
  const displayedHistory = [...validHistory].sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));

  // Grouping logic
  const groups = {
    today: [],
    yesterday: [],
    older: []
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  displayedHistory.forEach(h => {
    const d = new Date(h.startedAt);
    d.setHours(0,0,0,0);
    if (d.getTime() === today.getTime()) groups.today.push(h);
    else if (d.getTime() === yesterday.getTime()) groups.yesterday.push(h);
    else groups.older.push(h);
  });

  const renderGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8" key={title}>
        <div className="section-header mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="text-secondary font-bold uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>{title}</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
        </div>
        <div className="history-list">
          {items.map(h => {
            const total = h.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
            const isPayer = h.payerId === currentUser?.id;
            const date = new Date(h.startedAt);

            return (
              <div key={h.id} className="history-card mb-3" onClick={() => onSelectSession(h)}>
                <div className="history-card-header">
                  <div style={{ background: 'var(--bg-primary)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                    <Calendar size={20} className="text-secondary" />
                  </div>
                  <div className="history-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 800 }}>{h.payer}</p>
                      {isPayer && <span className="badge-role payer" style={{ fontSize: '0.5rem', padding: '2px 6px' }}>PAYER</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} className="text-secondary" />
                      <span className="history-time">{date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {h.orders?.length || 0} Items</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <p className="history-total">{formatRp(total)}</p>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', marginTop: '2px' }}>Selesai</p>
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
  };

  return (
    <div className="history-view fade-in session-container">
      <div className="section-header mb-8">
        <h2 className="mb-1">Histori Sesi</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Rekam jejak kopi yang pernah diseduh.</p>
      </div>

      {displayedHistory.length === 0 ? (
        <div className="empty-state-card" style={{ padding: '4rem 2rem' }}>
          <HistoryIcon size={64} style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem', opacity: 0.5 }} />
          <p className="text-secondary font-bold">Belum ada riwayat ngopi kamu.</p>
        </div>
      ) : (
        <>
          {renderGroup('Hari Ini', groups.today)}
          {renderGroup('Kemarin', groups.yesterday)}
          {renderGroup('Sebelumnya', groups.older)}
        </>
      )}
    </div>
  );
}

export default HistoryView;
