import { useAppStore } from "../context/useAppStore.js";
import { Coffee, Clock, Users, Shield, Sparkles } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { formatTime } from '../utils/formatters.js';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedSection } from '../components/AnimatedSection';

function HomeView({ timeLeft, onStartSession, onJoinSession, onSelectSession, setSelectedSession }) {
  const { store, currentUser } = useAppStore();
  const { session, history } = store;
  const { scrollY } = useScroll();
  
  // Parallax transforms for background elements
  const y1 = useTransform(scrollY, [0, 500], [0, -100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -200]);
  const rotate = useTransform(scrollY, [0, 500], [0, 45]);
  
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

  return (
    <div className="home-view" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Parallax Background Elements */}
      <motion.div 
        style={{ y: y1, rotate, position: 'absolute', top: '10%', right: '-20px', opacity: 0.1, zIndex: 0 }}
      >
        <Coffee size={120} />
      </motion.div>
      <motion.div 
        style={{ y: y2, position: 'absolute', top: '40%', left: '-30px', opacity: 0.05, zIndex: 0 }}
      >
        <Sparkles size={80} />
      </motion.div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "out" }}
          className="welcome-section mb-6"
        >
          <p className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Selamat Pagi,</p>
          <h2 style={{ fontSize: '2.5rem', lineHeight: 1.1 }}>{currentUser?.username}! 👋</h2>
        </motion.div>

        {/* Dynamic Session Section */}
        {session && (session.status === 'open' || session.status === 'active' || session.status === 'payment-setup') ? (
          <AnimatedSection className="live-dashboard">
            <div className="live-indicator">
              <div className="pulsing-dot"></div>
              <span>{sessionDone ? 'SESI BERAKHIR' : `LIVE SESI • ${session.status === 'open' ? formatTime(timeLeft) : 'Payment Ready'}`}</span>
            </div>

            <h3 className="mb-4" style={{ fontSize: '1.25rem' }}>{sessionDone ? 'Ringkasan Sesi Hari Ini ☕' : 'Ditunggu kopinya! ☕'}</h3>

            <div className="participants-grid mb-4" style={{ display: 'grid', gridTemplateColumns: session.companion ? '1fr 1fr' : '1fr', gap: '16px' }}>
              <div className="participant-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <UserAvatar username={session.payer} size={48} />
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent-primary)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                    <Shield size={12} color="white" />
                  </div>
                </div>
                <div>
                  <p className="text-secondary" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>Payer</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800 }}>{session.payer}</p>
                </div>
              </div>

              {session.companion && (
                <div className="participant-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--glass-border)' }}>
                  <div style={{ position: 'relative' }}>
                    <UserAvatar username={session.companion} size={48} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--success)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                      <Users size={12} color="white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.05em' }}>Companion</p>
                    <p style={{ fontSize: '1rem', fontWeight: 800 }}>{session.companion}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="session-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} className="text-secondary" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{session.orders?.length || 0} Peserta</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
                style={{ width: 'auto', padding: '0.5rem 1.25rem', height: '42px', fontSize: '0.85rem' }}
                onClick={async () => {
                  if (sessionDone) {
                    setSelectedSession(session);
                    onSelectSession(session);
                  } else {
                    if (onJoinSession) await onJoinSession();
                  }
                }}
              >
                {sessionDone ? 'Lihat Detail' : (session.status === 'open' ? 'Join Sesi' : 'Lihat Sesi')}
              </motion.button>
            </div>
          </AnimatedSection>
        ) : (
          <AnimatedSection className="home-banner">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h3 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>Siap untuk secangkir kopi?</h3>
              <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '2rem', fontWeight: 500 }}>Mulai sesi bareng teman-teman sekarang dan bagikan momen seru.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
                style={{ background: 'white', color: 'var(--accent-primary)', width: 'auto', padding: '14px 32px', fontSize: '1.1rem', boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }}
                onClick={onStartSession}
              >
                Mulai Sesi Baru
              </motion.button>
            </motion.div>
          </AnimatedSection>
        )}

        <AnimatedSection className="section-header mt-8 mb-4" delay={0.3}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '20px', background: 'var(--accent-primary)', borderRadius: '4px' }}></div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Statistik Kamu</h4>
          </div>
        </AnimatedSection>

        <div className="status-grid">
          <AnimatedSection delay={0.4}>
            <div className="stat-card">
              <div style={{ background: 'rgba(230, 145, 56, 0.15)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sesi</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{history?.length || 0}</p>
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={0.5}>
            <div className="stat-card">
              <div style={{ background: 'rgba(230, 145, 56, 0.15)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Coffee size={18} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dipesan</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{history?.filter(s => s.orders.some(o => o.userId === currentUser?.id || (o.username || '').toLowerCase() === (currentUser?.username || '').toLowerCase())).length || 0}</p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}

export default HomeView;


