import { useAppStore } from "../context/useAppStore.js";
import { Bell, Info, CreditCard, Coffee, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '../utils/formatters.js';

/**
 * Helper to get icons and accent colors for notification types
 */
function notifMeta(type) {
  const map = {
    info:     { icon: <Info size={18} />,          color: 'var(--accent-primary)',  bg: 'rgba(230, 145, 56, 0.12)' },
    payment:  { icon: <CreditCard size={18} />,    color: 'var(--accent-light)',    bg: 'rgba(255, 194, 132, 0.12)' },
    bought:   { icon: <Coffee size={18} />,        color: 'var(--success)',         bg: 'rgba(16, 185, 129, 0.12)' },
    reminder: { icon: <Clock size={18} />,         color: 'var(--warning)',         bg: 'rgba(245, 158, 11, 0.12)' },
    done:     { icon: <CheckCircle size={18} />,   color: 'var(--success)',         bg: 'rgba(16, 185, 129, 0.12)' },
    debt:     { icon: <AlertTriangle size={18} />, color: 'var(--danger)',          bg: 'rgba(239, 68, 68, 0.12)' }
  };
  return map[type] || { icon: <Bell size={18} />, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' };
}

/**
 * NotificationView Component
 * Premium card-based notification list with contextual icons and read/unread states.
 */
function NotificationView({ onAction }) {
  const { store, currentUser } = useAppStore();
  const username = currentUser?.username;
  const userId = currentUser?.id;
  const notifications = store.session?.notifications || [];
  const myNotifs = notifications.filter(n => n.toId === userId || (n.to || '').toLowerCase() === (username || '').toLowerCase() || n.to === 'all');

  return (
    <div className="notif-view fade-in session-container">
      <div className="view-header mb-6">
        <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Notifikasi</h2>
        {myNotifs.length > 0 && (
          <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
            {myNotifs.length} notifikasi
          </p>
        )}
      </div>

      <div className="notif-list">
        {myNotifs.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
            <div style={{ 
              width: '72px', height: '72px', borderRadius: '50%', 
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 1.5rem' 
            }}>
              <Bell size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Belum Ada Notifikasi</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Notifikasi terbaru akan muncul di sini.</p>
          </div>
        ) : (
          <div className="card-stack">
            {[...myNotifs].reverse().map(n => {
              const isRead = (n.readBy || []).some(r => r === userId || (r || '').toLowerCase() === (username || '').toLowerCase());
              const meta = notifMeta(n.type);

              return (
                <div
                  key={n.id}
                  className="notif-card-premium"
                  onClick={() => onAction && onAction(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '1.25rem',
                    background: isRead ? 'var(--surface)' : 'var(--surface-hover)',
                    border: `1px solid ${isRead ? 'var(--glass-border)' : 'rgba(230, 145, 56, 0.2)'}`,
                    borderRadius: '20px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Unread indicator dot */}
                  {!isRead && (
                    <div style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      boxShadow: '0 0 8px var(--accent-glow)'
                    }} />
                  )}

                  {/* Icon circle */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: meta.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: meta.color
                  }}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.9rem',
                      fontWeight: isRead ? 600 : 700,
                      color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                      lineHeight: 1.5,
                      marginBottom: '6px',
                      wordBreak: 'break-word'
                    }}>
                      {n.message || 'Pesan notifikasi'}
                    </p>
                    <p style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Clock size={12} />
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationView;
