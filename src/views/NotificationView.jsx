import { useAppContext } from '../context/AppContext.jsx';
import { Bell, Info, CreditCard, Coffee, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '../utils/formatters.js';

/**
 * Helper to get icons for notification types
 */
function notifIcon(type) {
  const icons = {
    info: <Info size={18} />,
    payment: <CreditCard size={18} />,
    bought: <Coffee size={18} />,
    reminder: <Clock size={18} />,
    done: <CheckCircle size={18} />,
    debt: <AlertTriangle size={18} />
  };
  return icons[type] || <Bell size={18} />;
}

/**
 * NotificationView Component
 */
function NotificationView({ onAction }) {
  const { store, currentUser } = useAppContext();
  const username = currentUser?.username;
  const userId = currentUser?.id;
  const notifications = store.session?.notifications || [];
  const myNotifs = notifications.filter(n => n.toId === userId || n.to === username || n.to === 'all');

  return (
    <div className="notif-view fade-in">
      <div className="view-header">
        <h2 className="text-gradient">Notifikasi</h2>
      </div>

      <div className="notif-list">
        {myNotifs.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '4rem' }}>
            <Bell size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p className="text-secondary">Belum ada notifikasi baru untukmu.</p>
          </div>
        ) : (
          [...myNotifs].reverse().map(n => (
            <div
              key={n.id}
              className={`notif-card ${n.readBy?.includes(username) ? 'read' : 'unread'}`}
              onClick={() => onAction && onAction(n)}
              style={{ cursor: 'pointer' }}
            >
              <div className="notif-icon-circle">
                {notifIcon(n.type)}
              </div>
              <div className="notif-content">
                <p className="notif-title">{n.message || 'Pesan notifikasi'}</p>
                <p className="notif-time">{formatDate(n.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationView;
