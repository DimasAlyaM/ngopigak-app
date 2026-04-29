import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Bell, Coffee, Clock, History, PlusCircle, Shield, User, Home, AlertTriangle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

// Zustand Store & Hooks
import { useAppStore } from './context/useAppStore.js';
import { useAuth } from './hooks/useAuth.js';
import { useSessionActions } from './hooks/useSessionActions.js';
import { api, initSupabaseSync, refreshStore } from './store.js'; // Keep api for inner component usage if needed

// Components
import ConfirmDialog from './components/ConfirmDialog';
import ProofPreviewModal from './components/ProofPreviewModal';

// Views
import NotificationView from './views/NotificationView';
import OrderDetailView from './views/OrderDetailView';
import AdminPinGate from './views/AdminPinGate';
import AdminView from './views/AdminView';
import ProfileView from './views/ProfileView';
import HistoryView from './views/HistoryView';
import HistoryDetailView from './views/HistoryDetailView';
import HomeView from './views/HomeView';
import MyOrdersView from './views/MyOrdersView';
import SessionView from './views/SessionView';

// ─── BOTTOM NAVIGATION COMPONENT ───────────────────────────────────────────
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  
  const { store, currentUser } = useAppStore();
  const myNotifs = (store.session?.notifications || []).filter(n => n.toId === currentUser?.id || n.to === 'all');
  const unread = myNotifs.filter(n => 
    !n.readBy?.includes(currentUser?.id) && !n.readBy?.includes(currentUser?.username)
  ).length;

  const markNotifsRead = async () => {
    if (!store.session) return;
    let changed = false;
    const updatedNotifs = store.session.notifications.map(n => {
      const isForMe = n.toId === currentUser?.id || n.to === 'all';
      const alreadyRead = n.readBy?.includes(currentUser?.id) || n.readBy?.includes(currentUser?.username);
      if (isForMe && !alreadyRead) {
        changed = true;
        api.markNotifRead(n.id, currentUser?.id).catch(err => console.error(err));
        return { ...n, readBy: [...(n.readBy || []), currentUser?.id] };
      }
      return n;
    });
    if (changed) {
      useAppStore.getState().setStoreParam({
        session: { ...store.session, notifications: updatedNotifs }
      });
    }
  };

  return (
    <nav className="bottom-nav">
      <div className={`nav-item ${path === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
        <div className="nav-icon"><Home size={22} strokeWidth={path === '/' ? 2.5 : 2} /></div>
        <span>Home</span>
      </div>
      <div className={`nav-item ${path.startsWith('/history') ? 'active' : ''}`} onClick={() => navigate('/history')}>
        <div className="nav-icon"><History size={22} strokeWidth={path.startsWith('/history') ? 2.5 : 2} /></div>
        <span>History</span>
      </div>
      <div className={`nav-item ${path === '/notifications' ? 'active' : ''}`} onClick={() => { navigate('/notifications'); markNotifsRead(); }}>
        <div className="nav-icon">
          <Bell size={22} strokeWidth={path === '/notifications' ? 2.5 : 2} />
          {unread > 0 && <span className="nav-badge">{unread}</span>}
        </div>
        <span>Notif</span>
      </div>
      <div className={`nav-item ${path.startsWith('/orders') || path.startsWith('/order/') ? 'active' : ''}`} onClick={() => navigate('/orders')}>
        <div className="nav-icon"><Clock size={22} strokeWidth={path.startsWith('/orders') ? 2.5 : 2} /></div>
        <span>Orders</span>
      </div>
      <div className={`nav-item ${path === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
        <div className="nav-icon"><User size={22} strokeWidth={path === '/profile' ? 2.5 : 2} /></div>
        <span>Profile</span>
      </div>
      {currentUser?.username?.toLowerCase() === 'admin' && (
        <div className={`nav-item ${path === '/admin' ? 'active' : ''}`} onClick={() => navigate('/admin')}>
          <div className="nav-icon"><Shield size={22} strokeWidth={path === '/admin' ? 2.5 : 2} /></div>
          <span>Admin</span>
        </div>
      )}
    </nav>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { store, currentUser, selectedSession, selectedOrder, setSelectedSession, setSelectedOrder, updateActivity } = useAppStore();
  const { login, logout, saveProfile } = useAuth();
  const actions = useSessionActions();
  const navigate = useNavigate();
  const location = useLocation();

  // Local UI states
  const [loginInput, setLoginInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const timerRef = useRef(null);
  const coffeeDropdownRef = useRef(null);
  const [renderError] = useState(null);

  // Dialogs & Form states
  const [dialog, setDialog] = useState(null); 
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [previewProof, setPreviewProof] = useState(null); 
  const [selectedCoffeeId, setSelectedCoffeeId] = useState('');
  const [coffeeSearch, setCoffeeSearch] = useState('');
  const [showMenuResults, setShowMenuResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // New Loading State

  const sessionDone = store.session?.status === 'completed' || store.session?.status === 'force-closed';

  // Timer management
  useEffect(() => {
    // Start Supabase sync once
    initSupabaseSync();
  }, []);

  useEffect(() => {
    const session = store.session;
    if (session?.status === 'open') {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        actions.closeSessionAndSelectRoles();
        return;
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            actions.closeSessionAndSelectRoles();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [store.session?.status, store.session?.id, actions]);

  // Confetti celebration
  useEffect(() => {
    if (location.pathname === '/live-session' && store.session?.status === 'completed') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [store.session?.status, location.pathname]);

  // AUTO-LOGOUT AFTER 30 MINS INACTIVITY
  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimer;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      updateActivity();
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
        alert('Sesi kamu berakhir karena tidak ada aktivitas selama 30 menit.');
      }, INACTIVITY_LIMIT);
    };

    // Events to track activity
    const activityEvents = [
      'mousedown', 'mousemove', 'keydown', 
      'scroll', 'touchstart', 'click'
    ];

    // Initialize timer
    resetTimer();

    // Add listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser, logout]);

  // AUTO-FINALIZE WATCHER
  useEffect(() => {
    if (!store.session || store.session.status !== 'active' || !currentUser) return;
    if (currentUser.id !== store.session.payerId) return;

    const others = store.session.orders.filter(o =>
      o.userId !== store.session.payerId &&
      o.userId !== store.session.companionId
    );
    const allOthersPaid = others.every(o => o.isPaid);

    if (allOthersPaid && store.session.coffeeBought) {
      actions.checkSessionComplete();
    }
  }, [store.session, currentUser, actions]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await login(loginInput.trim(), pinInput.trim());
    if (res.success) {
      setLoginInput('');
      setPinInput('');
      navigate('/');
    }
    setIsSubmitting(false);
  };

  // Click outside menu block
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (coffeeDropdownRef.current && !coffeeDropdownRef.current.contains(event.target)) {
        setShowMenuResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (renderError) {
    return (
      <div className="empty-state" style={{ padding: '4rem 2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', border: '2px solid var(--red)' }}>
          <AlertTriangle size={48} className="text-red mb-4" />
          <h2 className="text-red">Waduh, Sistem Eror!</h2>
          <p className="text-secondary mt-2 mb-6">Terjadi masalah saat memuat data. Tenang, data ngopi kamu aman kok.</p>
          <code style={{ display: 'block', background: '#f5f5f5', padding: '1rem', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'left', overflow: 'auto' }}>{renderError}</code>
          <button className="btn-primary mt-6" style={{ width: '100%' }} onClick={() => window.location.reload()}>Refresh Halaman</button>
        </div>
      </div>
    );
  }

  // ─── VIEW: LOGIN ────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="app-container login-mode">
        <div className="login-screen fade-in">
          <div className="login-card glass-panel">
            <div className="login-brand">
              <div className="login-logo"><Coffee size={40} /></div>
              <h1 className="text-gradient">NgopiGak</h1>
            </div>
            <h2 className="login-title">Selamat Datang</h2>
            <p className="text-secondary">Silakan masuk untuk mulai ngopi bareng rekan tim kamu.</p>
            <form onSubmit={handleLogin} className="modern-form">
              <div className="form-group">
                <label>Nama Pengguna</label>
                <input type="text" value={loginInput} onChange={e => setLoginInput(e.target.value)} placeholder="Masukkan nama kamu" autoFocus required />
              </div>
              <div className="form-group">
                <label>4 Digit PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))} placeholder="****" required />
              </div>
              <button disabled={isSubmitting} type="submit" className="btn-primary">
                {isSubmitting ? 'Loading...' : 'Masuk Sekarang'}
              </button>
            </form>
            <div className="login-footer">Dimsam • 2026</div>
          </div>
        </div>
      </div>
    );
  }

  if (!store || !useAppStore.getState().isInitialized) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--secondary-text)' }}>
          <Coffee size={40} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary-color)' }} />
          <p>Memuat Data NgopiGak...</p>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="app-container main-app">
      <header className="mobile-header">
        {location.pathname !== '/' && (
          <button 
            className="btn-back" 
            onClick={() => navigate(-1)} 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              marginRight: '12px'
            }}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-gradient">NgopiGak</h1>
        <div className="header-actions"></div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomeView timeLeft={timeLeft} onStartSession={actions.startSession} onJoinSession={async () => { await refreshStore(); navigate('/live-session'); }} onSelectSession={(s) => { setSelectedSession(s); navigate(`/history/${s.id}`); }} />} />
          <Route path="/orders" element={<MyOrdersView setView={(v) => navigate(v === 'order-detail' ? `/order/${selectedOrder?.sessionId}` : `/${v}`)} setSelectedOrder={setSelectedOrder} />} />
          <Route path="/live-session" element={
            <SessionView
              timeLeft={timeLeft} setView={(v) => navigate(`/${v}`)} setSelectedSession={(s) => { setSelectedSession(s); navigate(`/history/${s.id}`); }} setSelectedOrder={(o) => { setSelectedOrder(o); navigate(`/order/${o.sessionId}`); }}
              setDialog={setDialog} setPreviewProof={setPreviewProof} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} bankName={bankName} setBankName={setBankName} accountNo={accountNo} setAccountNo={setAccountNo} coffeeSearch={coffeeSearch} setCoffeeSearch={setCoffeeSearch} showMenuResults={showMenuResults} setShowMenuResults={setShowMenuResults} coffeeDropdownRef={coffeeDropdownRef} selectedCoffeeId={selectedCoffeeId} setSelectedCoffeeId={setSelectedCoffeeId}
              onAddOrder={async (e) => { e.preventDefault(); if (!selectedCoffeeId) { alert('Silakan pilih menu kopi dari daftar terlebih dahulu.'); return; } await actions.addOrder(selectedCoffeeId); setSelectedCoffeeId(''); setCoffeeSearch(''); }} onStartSession={actions.startSession} onConfirmBought={actions.confirmBought} onRemindAll={actions.remindAll} onMarkPaidByPayer={actions.markPaidByPayer} onForceClose={() => actions.forceClose(() => setDialog(null))} onSubmitPaymentInfo={(e) => { e.preventDefault(); actions.submitPaymentInfo(paymentMethod, bankName, accountNo).then(() => { setPaymentMethod(''); setBankName(''); setAccountNo(''); }); }} onCloseSessionNow={actions.closeSessionAndSelectRoles}
            />
          } />
          <Route path="/history" element={<HistoryView onSelectSession={(s) => { setSelectedSession(s); navigate(`/history/${s.id}`); }} />} />
          <Route path="/history/:id" element={<HistoryDetailView session={selectedSession} onBack={() => navigate('/history')} setPreviewProof={setPreviewProof} setView={(v) => navigate(v === 'order-detail' ? `/order/${selectedOrder?.sessionId}` : `/${v}`)} setSelectedOrder={setSelectedOrder} />} />
          <Route path="/order/:id" element={<OrderDetailView order={selectedOrder} onBack={() => window.history.length > 1 ? navigate(-1) : navigate('/orders')} onPaymentConfirm={actions.checkSessionComplete} setDialog={setDialog} setPreviewProof={setPreviewProof} />} />
          <Route path="/profile" element={<ProfileView onSave={saveProfile} onLogout={logout} />} />
          <Route path="/notifications" element={<NotificationView onAction={actions.handleNotifAction} />} />
          <Route path="/admin" element={!isAdminUnlocked ? <AdminPinGate onSuccess={() => setIsAdminUnlocked(true)} onClose={() => navigate('/')} /> : <AdminView onForceClose={() => actions.forceClose(() => setDialog(null))} onDeleteActiveSession={api.deleteActiveSession} onDeleteHistory={api.deleteHistory} onUpdateHistoricalOrder={api.updateHistoricalOrder} onDeleteAllNotifs={api.deleteAllNotifications} setDialog={setDialog} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* FAB: Start/Join Session (Visible on Home) */}
      {location.pathname === '/' && (
        <button className="fab" onClick={(!store.session || sessionDone) ? actions.startSession : async () => { await refreshStore(); navigate('/live-session'); }}>
          <PlusCircle size={32} />
        </button>
      )}

      <BottomNav />

      {/* Dialogs & Modals */}
      {dialog && (
        <ConfirmDialog title={dialog.title} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={() => setDialog(null)} confirmText={dialog.confirmText} danger={dialog.danger} />
      )}
      {previewProof && (
        <ProofPreviewModal url={previewProof.url} username={previewProof.username} onClose={() => setPreviewProof(null)} />
      )}
    </div>
  );
}
