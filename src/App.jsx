import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStore, selectRoles } from './store.js';
import {
  Bell, Coffee, Clock, History, PlusCircle, Shield, User, Home, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

// Context
import { useAppContext } from './context/AppContext.jsx';

// Utilities
import { formatRp, formatTime, formatDate } from './utils/formatters.js';

// Components
import UserAvatar from './components/UserAvatar';
import StatusBadge from './components/StatusBadge';
import Stepper from './components/Stepper';
import ConfirmDialog from './components/ConfirmDialog';
import ProofPreviewModal from './components/ProofPreviewModal';
import PaymentInfoCard from './components/PaymentInfoCard';

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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { store, setStore, currentUser, setCurrentUser, api } = useAppContext();
  
  const [loginInput, setLoginInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [view, setView] = useState('home'); 
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [historyFilter, setHistoryFilter] = useState('all'); 
  const [expandedSession, setExpandedSession] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null); 

  // Timer
  const [timeLeft, setTimeLeft] = useState(600);
  const timerRef = useRef(null);
  const coffeeDropdownRef = useRef(null);
  const [renderError, setRenderError] = useState(null);

  // Dialogs
  const [dialog, setDialog] = useState(null); 
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [previewProof, setPreviewProof] = useState(null); 

  // Form states
  const [selectedCoffeeId, setSelectedCoffeeId] = useState('');
  const [coffeeSearch, setCoffeeSearch] = useState('');
  const [showMenuResults, setShowMenuResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [proofInput, setProofInput] = useState(''); 
  const [isUploadingActive, setIsUploadingActive] = useState(false);

  // Derived states
  const session = store.session;
  const myRole = (() => {
    if (!session || !currentUser) return null;
    const cur = currentUser.toLowerCase();
    if ((session.payer || '').toLowerCase() === cur) return 'payer';
    if ((session.companion || '').toLowerCase() === cur) return 'companion';
    if (session?.orders?.some(o => (o.username || '').toLowerCase() === cur)) return 'penitip';
    return null;
  })();
  const myOrder = session?.orders?.find(o => (o.username || '').toLowerCase() === (currentUser || '').toLowerCase());
  const myNotifs = session?.notifications?.filter(n => n.to === currentUser || n.to === 'all') || [];
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

  const closeSessionAndSelectRoles = useCallback(async () => {
    const s = loadStore();
    if (!s.session || s.session.status !== 'open') return;

    if (s.session.orders.length === 0) {
      await api.updateSession(s.session.id, {
        status: 'force-closed',
        forceClosedBy: 'System (Timeout)',
        closedAt: new Date().toISOString()
      });
      return;
    }

    const participants = [...new Set(s.session.orders.map(o => o.username))];
    const sortedHistory = [...(s.history || [])].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const lastSession = sortedHistory[0];
    const lastRoles = lastSession ? { payer: lastSession.payer, companion: lastSession.companion } : null;

    const { payer, companion } = selectRoles(participants, s.payerHistory || {}, lastRoles);
    
    await api.updateSession(s.session.id, {
      status: 'payment-setup',
      payer, companion, closedAt: new Date().toISOString()
    });

    participants.forEach(p => {
      api.notify(s.session.id, p, 'info', `Sesi ditutup! Pembayar: ${payer} | Pendamping: ${companion || '-'}`);
    });
    api.notify(s.session.id, payer, 'info', `Kamu terpilih sebagai Pembayar! Silakan lengkapi info pembayaran.`);
  }, [api]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (coffeeDropdownRef.current && !coffeeDropdownRef.current.contains(event.target)) {
        setShowMenuResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer management
  useEffect(() => {
    const session = store.session;
    if (session?.status === 'open') {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        closeSessionAndSelectRoles();
        return;
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            closeSessionAndSelectRoles();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [store.session?.status, store.session?.id]);

  // Confetti celebration for 'completed' session
  useEffect(() => {
    if (view === 'live-session' && store.session?.status === 'completed') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [store.session?.status, view]);

  // AUTO-FINALIZE WATCHER: Triggered whenever session state changes
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    if (currentUser.toLowerCase() !== (session.payer || '').toLowerCase()) return;

    const others = session.orders.filter(o =>
      o.username.toLowerCase() !== session.payer.toLowerCase() &&
      o.username.toLowerCase() !== (session.companion || '').toLowerCase()
    );
    const allOthersPaid = others.every(o => o.isPaid);

    if (allOthersPaid && session.coffeeBought) {
      console.log("Watcher: All conditions met. Finalizing session...");
      checkSessionComplete();
    }
  }, [session, currentUser]);


  // ─── ACTIONS ───────────────────────────────────────────────────────────────

  const login = async (e) => {
    e.preventDefault();
    const name = loginInput.trim();
    const pin = pinInput.trim();
    if (!name || pin.length !== 4) {
      alert("Masukkan nama dan 4 digit PIN.");
      return;
    }

    try {
      const res = await api.login(name, pin);
      if (res.success) {
        // Only show registration message if it's actually the very first setup 
        // to avoid annoying repetitive alerts.
        if (res.isNew) {
          alert(`Selamat datang ${name}! PIN kamu telah didaftarkan.`);
        }
        setCurrentUser(name);
        localStorage.setItem('ngopi_current_user', name);
        setLoginInput('');
        setPinInput('');
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat login.");
    }
  };

  const logout = () => {
    setCurrentUser('');
    localStorage.removeItem('ngopi_current_user');
    setView('home');
    setDialog(null);
  };

  const startSession = async () => {
    const s = loadStore();
    if (s.session && s.session.status !== 'completed' && s.session.status !== 'force-closed') {
      alert('Sudah ada sesi aktif!');
      return;
    }
    await api.createSession(currentUser);
    setView('live-session');
  };

  const addOrder = async (e) => {
    e.preventDefault();
    if (!selectedCoffeeId || !currentUser) return;
    const s = loadStore();
    if (!s.session || s.session.status !== 'open') return;

    const menu = s.menu.find(m => m.id === selectedCoffeeId);
    if (!menu) return;

    await api.addOrder(s.session.id, currentUser, menu);
    setSelectedCoffeeId('');
  };



  const submitPaymentInfo = async (e) => {
    e.preventDefault();
    if (!paymentMethod || !accountNo) return;
    if (paymentMethod === 'BANK' && !bankName) return;

    const s = loadStore();
    if (!s.session) return;
    const payer = s.session.payer;

    await api.updateSession(s.session.id, {
      status: 'active',
      paymentInfo: {
        method: paymentMethod,
        bankName: paymentMethod === 'BANK' ? bankName : null,
        accountNo: accountNo
      }
    });
    await api.incrementRoleCount(payer, 'pay');
    if (s.session.companion) {
      await api.incrementRoleCount(s.session.companion, 'companion');
    }

    s.session.orders.forEach(o => {
      if (o.username !== payer) {
        api.notify(s.session.id, o.username, 'payment',
          ` Info Transfer: ${paymentMethod}${paymentMethod === 'BANK' ? ` (${bankName})` : ''} – ${accountNo} a.n. ${payer}. Total kamu: ${formatRp(o.item.price)}`
        );
      }
    });

    setPaymentMethod(''); setBankName(''); setAccountNo('');
  };

  const submitProof = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (!order) return;

    await api.updateOrder(order.id, { paymentProof: proofInput });
    api.notify(s.session.id, s.session.payer, 'payment', `${username} telah mengirimkan bukti pembayaran.`);
    alert('Bukti pembayaran terkirim!');
    setProofInput('');
  };

  const remindAll = async () => {
    const s = loadStore();
    if (!s.session) return;
    s.session.orders.forEach(o => {
      if (o.username !== s.session.payer && !o.isPaid) {
        api.notify(s.session.id, o.username, 'payment', `Tagihan ngopi! Jangan lupa bayar ke ${s.session.payer} ya bro.`);
      }
    });
    alert('Notifikasi tagihan dikirim!');
  };

  const confirmBought = async () => {
    const s = loadStore();
    if (!s.session) return;
    await api.updateSession(s.session.id, { coffeeBought: true });
    s.session.orders.forEach(o => {
      if (o.username !== currentUser) {
        api.notify(s.session.id, o.username, 'bought', ` Kopi sudah dibeli oleh ${s.session.payer} dan dalam perjalanan!`);
      }
    });
    setDialog(null);
    // After buying, watcher will check if session is now complete
  };

  const markMyPayment = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, false);
      api.notify(s.session.id, s.session.payer, 'payment', `${username} sudah bayar (menunggu verifikasi).`);
      // checkSessionComplete will be called by Payer when they verify
    }
  };

  const handleNotifAction = (n) => {
    const s = loadStore();
    const targetSessionId = n.sessionId || n.session_id;

    // 1. Check if it's the current session in memory
    if (s.session && s.session.id === targetSessionId) {
      setView('live-session');
      return;
    }

    // 2. Check in History
    const histSession = s.history.find(h => h.id === targetSessionId);
    if (histSession) {
      const myOrder = histSession.orders?.find(o => (o.username || '').toLowerCase() === currentUser.toLowerCase());
      if (myOrder) {
        setSelectedOrder({
          ...myOrder,
          sessionDate: histSession.startedAt,
          payer: histSession.payer,
          isPaid: !(histSession.debtors || []).some(d => (d || '').toLowerCase() === currentUser.toLowerCase()),
          sessionId: histSession.id
        });
        setView('order-detail');
      } else {
        setSelectedSession(histSession);
        setView('history-detail');
      }
      return;
    }

    // 3. Fallback logic
    if (n.message && n.message.toLowerCase().includes('sesi')) {
      if (s.session && !sessionDone) setView('live-session');
      else setView('history');
      return;
    }

    // Final fallback
    setView('history');
  };

  const markPaidByPayer = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, true);
      api.notify(s.session.id, username, 'payment', `${s.session.payer} mengonfirmasi pembayaranmu.`);
      // No need to call checkSessionComplete, the watcher handles it
    }
  };

  async function checkSessionComplete() {
  const s = loadStore();
  if (!s.session) return;

  const session = s.session;
  const others = session.orders.filter(o =>
    o.username.toLowerCase() !== (session.payer || '').toLowerCase() &&
    o.username.toLowerCase() !== (session.companion || '').toLowerCase()
  );
  const allOthersPaid = others.every(o => o.isPaid);

  if (allOthersPaid && session.coffeeBought) {
    alert('Selamat Ngopi! Semua pembayaran sudah lunas & kopi sudah dikonfirmasi.');
    setView('home');
    try {
      await api.updateSession(session.id, { status: 'completed' });
      const historyPayload = {
        ...session,
        status: 'completed',
        companion: session.companion,
        orders: session.orders.map(o => ({ ...o, isPaid: true }))
      };
      await api.saveHistory(session.id, historyPayload);
      await api.deleteActiveSession(session.id);
      session.orders.forEach(o => {
        api.notify(session.id, o.username, 'done', 'Sesi ngopi selesai! Makasih sudah patungan adil.');
      });
    } catch (e) {
      console.error("Error closing session history:", e);
    }
  }
}

const forceClose = async () => {
  const s = loadStore();
  if (!s.session) {
    setDialog(null);
    return;
  }

  // Instant UI Feedback: move to home and close dialog immediately
  setDialog(null);
  setView('home');
  setActiveMenu(null);

  try {
    const debtors = s.session.orders.filter(o => !o.isPaid && o.username !== s.session.payer).map(o => o.username);
    const sessionId = s.session.id;

    // Ensure counts are updated even on force close for fairness
    await api.incrementRoleCount(s.session.payer, 'pay');
    if (s.session.companion) {
      await api.incrementRoleCount(s.session.companion, 'companion');
    }

    // Wrap background work to ensure it completes
    await api.updateSession(sessionId, { status: 'force-closed', forceClosedBy: currentUser, debtors });
    const currentSession = loadStore().session;
    const full = { ...currentSession, status: 'force-closed', forceClosedBy: currentUser, debtors, companion: currentSession.companion };
    await api.saveHistory(sessionId, full);
    await api.deleteActiveSession(sessionId);

    if (debtors.length > 0) {
      debtors.forEach(d => api.notify(sessionId, d, 'debt', `Sesi ditutup paksa. Hutangmu dicatat.`));
    }
    s.session.orders.forEach(o => {
      api.notify(sessionId, o.username, 'done', `Sesi ditutup paksa oleh ${currentUser}.`);
    });
  } catch (err) {
    console.error("Force close background sync error:", err);
    // We don't alert here because the user is already on the Home screen
    // and the session is likely at least marked as closed in common scenarios.
  }
};

const finishViewSession = () => {
  setView('home');
};

const markNotifsRead = async () => {
  const s = loadStore();
  if (!s.session) return;

  // Optimistically update memory so badge clears instantly
  let changed = false;
  const updatedNotifs = s.session.notifications.map(n => {
    if ((n.to === currentUser || n.to === 'all') && !n.readBy?.includes(currentUser)) {
      changed = true;
      api.markNotifRead(n.id, currentUser).catch(err => console.error("Notif sync fail:", err));
      return { ...n, readBy: [...(n.readBy || []), currentUser] };
    }
    return n;
  });

  if (changed) {
    setStore({
      ...s,
      session: { ...s.session, notifications: updatedNotifs }
    });
  }
};

const saveMenu = async (newMenu) => {
  await api.saveMenu(newMenu);
};

const onResetPin = async (username) => {
  await api.resetUserPin(username);
  alert(`PIN untuk ${username} berhasil di-reset menjadi '1234'.`);
};

const onUpdateProfile = async (oldName, newName) => {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;

  try {
    await api.updateProfile(oldName, trimmed);
    // Update local states immediately
    setCurrentUser(trimmed);
    localStorage.setItem('ngopi_current_user', trimmed);
    setDialog(null); // Close confirmation if any
    setActiveMenu(null); // Close dropdown menu
    alert("Profil berhasil diperbarui!");
  } catch (err) {
    console.error(err);
    alert("Gagal memperbarui profil: " + err.message);
  }
};

const goToHistory = (filter = 'all') => {
  setHistoryFilter(filter);
  setView('history');
  setDialog(null); // Close any other dialogs
  setActiveMenu(null); // Close dropdowns
};


if (renderError) {
  return (
    <div className="empty-state" style={{ padding: '4rem 2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', border: '2px solid var(--red)' }}>
        <AlertTriangle size={48} className="text-red mb-4" />
        <h2 className="text-red">Waduh, Sistem Eror!</h2>
        <p className="text-secondary mt-2 mb-6">Terjadi masalah saat memuat data. Tenang, data ngopi kamu aman kok.</p>
        <code style={{ display: 'block', background: '#f5f5f5', padding: '1rem', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'left', overflow: 'auto' }}>
          {renderError}
        </code>
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

          <form onSubmit={login} className="modern-form">
            <div className="form-group">
              <label>Nama Pengguna</label>
              <input
                id="login-name"
                type="text"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                placeholder="Masukkan nama kamu"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label>4 Digit PIN</label>
              <input
                id="login-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                required
              />
            </div>
            <button id="login-submit" type="submit" className="btn-primary">
              Masuk Sekarang
            </button>
          </form>

          <div className="login-footer">
            Dimsam • 2026
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM NAVIGATION COMPONENT ───────────────────────────────────────────
const BottomNav = () => {
  const s = loadStore();
  const myNotifs = (s.session?.notifications || []).filter(n => n.to === currentUser || n.to === 'all');
  const unread = myNotifs.filter(n => !n.readBy?.includes(currentUser)).length;

  return (
    <nav className="bottom-nav">
      <div className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
        <div className="nav-icon"><Home size={20} /></div>
        <span>Home</span>
      </div>
      <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => goToHistory()}>
        <div className="nav-icon"><History size={20} /></div>
        <span>History</span>
      </div>
      <div className={`nav-item ${view === 'notifications' ? 'active' : ''}`} onClick={() => { setView('notifications'); markNotifsRead(); }}>
        <div className="nav-icon nav-badge-container">
          <Bell size={20} />
          {unread > 0 && <span className="nav-badge">{unread}</span>}
        </div>
        <span>Notif</span>
      </div>
      <div className={`nav-item ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
        <div className="nav-icon"><Clock size={20} /></div>
        <span>My Order</span>
      </div>
      <div className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
        <div className="nav-icon"><User size={20} /></div>
        <span>Profile</span>
      </div>
      {currentUser.toLowerCase() === 'admin' && (
        <div className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
          <div className="nav-icon"><Shield size={20} /></div>
          <span>Admin</span>
        </div>
      )}
    </nav>
  );
};

// ─── VIEW: HOME ─────────────────────────────────────────────────────────────
  const renderHome = () => (
    <HomeView
      timeLeft={timeLeft}
      onStartSession={startSession}
      onJoinSession={() => setView('live-session')}
      onSelectSession={(s) => { setSelectedSession(s); setView('history-detail'); }}
      setView={setView}
      setSelectedSession={setSelectedSession}
    />
  );

  const renderMyOrders = () => (
    <MyOrdersView
      setView={setView}
      setSelectedOrder={setSelectedOrder}
    />
  );

  const renderSession = () => (
    <SessionView
      timeLeft={timeLeft}
      setView={setView}
      setSelectedSession={setSelectedSession}
      setSelectedOrder={setSelectedOrder}
      setDialog={setDialog}
      setPreviewProof={setPreviewProof}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      bankName={bankName}
      setBankName={setBankName}
      accountNo={accountNo}
      setAccountNo={setAccountNo}
      coffeeSearch={coffeeSearch}
      setCoffeeSearch={setCoffeeSearch}
      showMenuResults={showMenuResults}
      setShowMenuResults={setShowMenuResults}
      coffeeDropdownRef={coffeeDropdownRef}
      selectedCoffeeId={selectedCoffeeId}
      setSelectedCoffeeId={setSelectedCoffeeId}
      onAddOrder={addOrder}
      onStartSession={startSession}
      onConfirmBought={confirmBought}
      onRemindAll={remindAll}
      onMarkPaidByPayer={markPaidByPayer}
      onForceClose={forceClose}
      onSubmitPaymentInfo={submitPaymentInfo}
      onCloseSessionNow={closeSessionAndSelectRoles}
    />
  );

// ─── MAIN RENDER ────────────────────────────────────────────────────────────
return (
  <div className="app-container main-app">
    <header className="mobile-header">
      <h1 className="text-gradient">NgopiGak</h1>
      <div className="header-actions">
        {/* Notifications moved to navbar */}
      </div>
    </header>

    <main className="main-content">
      {view === 'home' && renderHome()}
      {view === 'orders' && renderMyOrders()}
      {view === 'live-session' && renderSession()}
      {view === 'history' && (
        <HistoryView
          onSelectSession={(s) => {
            setSelectedSession(s);
            setView('history-detail');
          }}
        />
      )}
      {view === 'history-detail' && (
        <HistoryDetailView
          session={selectedSession}
          onBack={() => setView('history')}
          setPreviewProof={setPreviewProof}
          setView={setView}
          setSelectedOrder={setSelectedOrder}
        />
      )}
      {view === 'order-detail' && (
        <OrderDetailView
          order={selectedOrder}
          onBack={() => setView('orders')}
          onPaymentConfirm={checkSessionComplete}
          setDialog={setDialog}
          setPreviewProof={setPreviewProof}
        />
      )}
      {view === 'profile' && (
        <ProfileView
          onSave={onUpdateProfile}
          onLogout={logout}
        />
      )}
      {view === 'notifications' && (
        <NotificationView
          onAction={handleNotifAction}
        />
      )}
      {view === 'admin' && (
        !isAdminUnlocked ? (
          <AdminPinGate
            onSuccess={() => setIsAdminUnlocked(true)}
            onClose={() => setView('home')}
          />
        ) : (
          <AdminView
            onForceClose={forceClose}
            onDeleteActiveSession={api.deleteActiveSession}
            onDeleteHistory={api.deleteHistory}
            onUpdateHistoricalOrder={api.updateHistoricalOrder}
            onDeleteAllNotifs={api.deleteAllNotifications}
            setDialog={setDialog}
          />
        )
      )}
    </main>

    {/* FAB: Start/Join Session (Visible on Home) */}
    {view === 'home' && (
      <button
        className="fab"
        onClick={(!session || sessionDone) ? startSession : () => setView('live-session')}
      >
        <PlusCircle size={32} />
      </button>
    )}

    <BottomNav />

    {/* Dialogs & Modals */}
    {dialog && (
      <ConfirmDialog
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(null)}
        confirmText={dialog.confirmText}
        danger={dialog.danger}
      />
    )}

      {previewProof && (
        <ProofPreviewModal
          url={previewProof.url}
          username={previewProof.username}
          onClose={() => setPreviewProof(null)}
        />
      )}
    </div>
  );
}

