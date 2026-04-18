import { useAppContext } from '../context/AppContext.jsx';
import { Coffee, Clock, Users, Shield, PlusCircle } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { formatRp, formatTime } from '../utils/formatters.js';

function HomeView({ timeLeft, onStartSession, onJoinSession, onSelectSession, setView, setSelectedSession }) {
  const { store, currentUser } = useAppContext();
  const { session, history } = store;
  
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

  return (
    <div className="home-view fade-in" style={{ padding: '1rem' }}>
      <div className="welcome-section" style={{ marginBottom: '2rem' }}>
        <p className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Selamat Pagi,</p>
        <h2 style={{ fontSize: '1.8rem' }}>{currentUser?.username}! 👋</h2>
      </div>

      {/* Dynamic Session Section */}
      {session && (session.status === 'open' || session.status === 'active' || session.status === 'payment-setup') ? (
        <div className="live-dashboard glass-panel fade-in">
          <div className="live-indicator">
            <div className="pulsing-dot"></div>
            {sessionDone ? 'SESI BERAKHIR' : `LIVE SESI • ${session.status === 'open' ? formatTime(timeLeft) : 'Payment Ready'}`}
          </div>

          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>{sessionDone ? 'Ringkasan Sesi Hari Ini ☕' : 'Ditunggu kopinya! ☕'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: session.companion ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <UserAvatar username={session.payer} size={48} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent-primary)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                  <Shield size={10} color="white" />
                </div>
              </div>
              <div>
                <p className="text-secondary" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Payer</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 800 }}>{session.payer}</p>
              </div>
            </div>

            {session.companion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ position: 'relative' }}>
                  <UserAvatar username={session.companion} size={48} />
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#4ade80', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                    <Users size={10} color="white" />
                  </div>
                </div>
                <div>
                  <p className="text-secondary" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Companion</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800 }}>{session.companion}</p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} className="text-secondary" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{session.orders?.length || 0} Peserta</span>
            </div>
            <button
              className="btn-primary-pill"
              style={{ height: '40px', fontSize: '0.85rem', padding: '0 20px' }}
              onClick={() => {
                if (sessionDone) {
                  setSelectedSession(session);
                  setView('history-detail');
                } else {
                  setView('live-session');
                }
              }}
            >
              {sessionDone ? 'Lihat Detail' : (session.status === 'open' ? 'Join Sesi' : 'Lihat Sesi')}
            </button>
          </div>
        </div>
      ) : (
        <div className="home-banner glass-panel" style={{
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #ffb347 100%)',
          padding: '1.5rem',
          borderRadius: '24px',
          marginBottom: '2rem',
          color: 'white',
          boxShadow: '0 10px 30px rgba(230, 145, 56, 0.3)'
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Siap untuk secangkir kopi?</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '1.25rem' }}>Mulai sesi bareng teman-teman sekarang dan bagikan momen seru.</p>
          <button
            className="btn-primary"
            style={{ background: 'white', color: 'var(--accent-primary)', width: 'auto', padding: '10px 24px', fontSize: '0.9rem' }}
            onClick={onStartSession}
          >
            Mulai Baru
          </button>
        </div>
      )}

      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <div style={{ width: '4px', height: '18px', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Statistik Kamu</h4>
      </div>

      <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderRadius: '24px' }}>
          <div style={{ background: 'rgba(230, 145, 56, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Clock size={14} className="text-accent" />
          </div>
          <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Total Sesi</span>
          <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{history?.length || 0}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderRadius: '24px' }}>
          <div style={{ background: 'rgba(230, 145, 56, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Coffee size={14} className="text-accent" />
          </div>
          <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Kopi Dipesan</span>
          <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{history?.filter(s => s.orders.some(o => o.username === currentUser?.username)).length || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default HomeView;
