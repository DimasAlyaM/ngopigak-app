import { useAppStore } from "../context/useAppStore.js";
import { History } from 'lucide-react';
import { formatRp, formatDate } from '../utils/formatters.js';

/**
 * HistoryView Component
 */
function HistoryView({ onSelectSession }) {
  const { store, currentUser } = useAppStore();
  const { history } = store;
  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));
  const displayedHistory = [...validHistory].sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));

  return (
    <div className="history-view fade-in" style={{ padding: '1.5rem' }}>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="text-gradient"><History size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Histori Sesi</h2>
      </div>

      <div className="history-list">
        {displayedHistory.length === 0 ? (
          <div className="empty-state-card">
            <History size={48} className="text-secondary opacity-20 mb-4" />
            <p className="text-secondary">Belum ada riwayat ngopi kamu.</p>
          </div>
        ) : (
          displayedHistory.map(h => {
            const total = h.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
            const myOrder = h.orders?.find(o => o.userId === currentUser?.id);
            const isPayer = h.payerId === currentUser?.id;
            const isCompanion = h.companionId === currentUser?.id;

            return (
              <div key={h.id} className="history-card glass-panel" onClick={() => onSelectSession(h)}>
                <div className="history-card-header">
                  <div className="date-badge">
                    <span className="day">{new Date(h.startedAt).getDate()}</span>
                    <span className="month">{new Date(h.startedAt).toLocaleString('id-ID', { month: 'short' })}</span>
                  </div>
                  <div className="history-info">
                    <p className="history-time">{formatDate(h.startedAt).split(',')[1]}</p>
                    <p className="history-payer">Payer: <strong>{h.payer}</strong></p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="history-total">{formatRp(total)}</p>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {isPayer && <span className="role-tag payer">YOU PAYER</span>}
                      {isCompanion && <span className="role-tag companion">COMPANION</span>}
                      {myOrder && !isPayer && <span className="role-tag order">ORDERED</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default HistoryView;
