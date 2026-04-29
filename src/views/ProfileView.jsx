import { useState } from 'react';
import { useAppStore } from "../context/useAppStore.js";
import { Edit2, LogOut, Coffee, CreditCard, History, Users, Calendar } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { formatRp, formatDate } from '../utils/formatters.js';

/**
 * ProfileView Component
 */
function ProfileView({ onSave, onLogout }) {
  const { store, currentUser } = useAppStore();
  const { history } = store;
  const [name, setName] = useState(currentUser?.username || '');
  const [isEditing, setIsEditing] = useState(false);

  if (!currentUser) return null;
  const userId = currentUser.id;
  const username = currentUser.username;
  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));

  // Helper: check if an order belongs to current user
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

  const joinDate = mySessions.length > 0 
    ? formatDate([...mySessions].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))[0].startedAt).split(',')[0] 
    : 'Baru Bergabung';

  return (
    <div className="profile-view fade-in session-container">
      {/* Profile Header Hero */}
      <div className="glass-panel mb-8" style={{ padding: '3rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', 
          top: '-20%', 
          right: '-10%', 
          width: '200px', 
          height: '200px', 
          background: 'var(--accent-glow)', 
          filter: 'blur(80px)', 
          borderRadius: '50%',
          zIndex: 0,
          opacity: 0.5
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            padding: '4px', 
            background: 'linear-gradient(135deg, var(--accent-primary), transparent)', 
            borderRadius: '50%',
            boxShadow: 'var(--shadow-accent)'
          }}>
            <UserAvatar username={username} size={110} />
          </div>

          <div className="mt-6 text-center">
            {!isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>{username}</h2>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="btn-secondary"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ) : (
              <div className="modern-form mt-2" style={{ width: '100%', maxWidth: '300px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="premium-input"
                    style={{ flex: 1, padding: '0.75rem 1rem' }}
                    autoFocus
                  />
                  <button className="btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} onClick={handleSave}>Ok</button>
                </div>
              </div>
            )}
            <p className="text-secondary mt-3" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Calendar size={14} /> {joinDate}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="section-header mb-4">
        <h4 style={{ fontWeight: 800 }}>Statistik Ngopi</h4>
      </div>
      
      <div className="grid-2 mb-8">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: totalOwed > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <CreditCard size={20} color={totalOwed > 0 ? 'var(--danger)' : 'var(--success)'} />
          </div>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hutang</p>
          <h3 style={{ fontSize: '1.25rem', marginTop: '4px', color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatRp(totalOwed)}</h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: 'rgba(230, 145, 56, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Coffee size={20} color="var(--accent-primary)" />
          </div>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cup Dipesan</p>
          <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>{totalCoffee} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Cup</span></h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Users size={20} className="text-secondary" />
          </div>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jadi Payer</p>
          <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>{myPayerCount} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Kali</span></h3>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <History size={20} className="text-secondary" />
          </div>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ikut Sesi</p>
          <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>{mySessions.length} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Sesi</span></h3>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 mb-12">
        <button 
          className="btn-secondary" 
          style={{ 
            width: '100%', 
            padding: '1.25rem', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            color: 'var(--danger)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
            background: 'rgba(239, 68, 68, 0.05)'
          }} 
          onClick={onLogout}
        >
          <LogOut size={20} />
          <span style={{ fontWeight: 800 }}>Keluar Akun</span>
        </button>
      </div>
    </div>
  );
}

export default ProfileView;
