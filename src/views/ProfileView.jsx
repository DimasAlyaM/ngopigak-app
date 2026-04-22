import { useState } from 'react';
import { useAppStore } from "../context/useAppStore.js";
import { api } from "../store.js";
import { Edit2, LogOut } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { formatRp, formatDate } from '../utils/formatters.js';

/**
 * ProfileView Component
 */
function ProfileView({ onSave, onLogout }) {
  const { store, currentUser } = useAppStore();
  const { history, payerHistory } = store;
  const [name, setName] = useState(currentUser?.username || '');
  const [isEditing, setIsEditing] = useState(false);

  if (!currentUser) return null;
  const userId = currentUser.id;
  const username = currentUser.username;
  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));

  // Helper: check if an order belongs to current user (supports old data without userId)
  const isMyOrder = (o) => (userId && o.userId === userId) || o.username?.toLowerCase() === username?.toLowerCase();
  // Helper: check if a session's payer is current user
  const isMyPayerSession = (s) => (userId && s.payerId === userId) || s.payer?.toLowerCase() === username?.toLowerCase();

  // Stats
  const mySessions = validHistory.filter(s => s.orders.some(o => isMyOrder(o)));
  const myDebts = mySessions.filter(s =>
    !isMyPayerSession(s) &&
    (
      (userId && s.debtorIds?.includes(userId)) ||
      s.debtors?.some(d => (d || '').toLowerCase() === username.toLowerCase())
    )
  );

  const totalOwed = myDebts.reduce((acc, s) => {
    const myOrder = s.orders.find(o => isMyOrder(o));
    return acc + (myOrder?.item?.price || 0);
  }, 0);

  const totalCoffee = mySessions.reduce((acc, s) => {
    const count = s.orders.filter(o => isMyOrder(o)).length;
    return acc + count;
  }, 0);

  const myPayerCount = validHistory.filter(s => isMyPayerSession(s)).length;

  const handleSave = () => {
    onSave(userId, name);
    setIsEditing(false);
  };

  return (
    <div className="profile-view fade-in">
      <div className="profile-container glass-panel-premium" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div className="avatar-wrapper-large">
            <UserAvatar username={username} size={110} />
            <button className="edit-avatar-badge" onClick={() => setIsEditing(!isEditing)}>
              <Edit2 size={16} />
            </button>
          </div>

          {!isEditing ? (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{username}</h2>
              <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>Ngopi Sejak {mySessions.length > 0 ? formatDate([...mySessions].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))[0].startedAt).split(',')[0] : 'Hari Ini'}</p>
            </div>
          ) : (
            <div className="modern-form" style={{ marginTop: '1.5rem', width: '100%' }}>
              <div className="form-group">
                <label>Ubah Nama Tampilan</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="premium-input"
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button className="btn-primary-pill" style={{ padding: '0 20px', height: '50px' }} onClick={handleSave}>Simpan</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="stats-grid-modern">
          <div className="stat-box-modern">
            <span className="stat-label">Hutang</span>
            <h3 className={totalOwed > 0 ? 'text-red' : 'text-green'}>{formatRp(totalOwed)}</h3>
          </div>
          <div className="stat-box-modern">
            <span className="stat-label">Kopi Dipesan</span>
            <h3>{totalCoffee} <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>Cup</small></h3>
          </div>
          <div className="stat-box-modern">
            <span className="stat-label">Jadi Payer</span>
            <h3>{myPayerCount} <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>Kali</small></h3>
          </div>
          <div className="stat-box-modern">
            <span className="stat-label">Ikut Sesi</span>
            <h3>{mySessions.length} <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>Sesi</small></h3>
          </div>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <button className="btn-logout-premium" onClick={onLogout}>
            <LogOut size={20} />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileView;
