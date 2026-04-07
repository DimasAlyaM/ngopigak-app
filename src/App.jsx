import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStore, api, initSupabaseSync, selectRoles } from './store.js';
import './App.css';

// ─── UTILITY ─────────────────────────────────────────────────────────────────
function formatRp(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function notify(store, to, type, message) {
  const session = store.session;
  if (!session) return;
  api.notify(session.id, to, type, message);
  session.notifications.push({
    id: Date.now().toString() + Math.random(),
    to, type, message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

// ─── DIALOG COMPONENT ─────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Ya, Lanjutkan', danger = false }) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box glass-panel" onClick={e => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message text-secondary">{message}</p>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>Batal</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotifBell({ notifications, username, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const myNotifs = notifications.filter(n => n.to === username || n.to === 'all');
  const unread = myNotifs.filter(n => !n.read).length;
  return (
    <div className="notif-wrapper">
      <button className="notif-btn" onClick={() => { setOpen(o => !o); onMarkRead(); }}>
        🔔 {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown glass-panel">
          <div className="notif-header">Notifikasi</div>
          {myNotifs.length === 0 && <p className="text-secondary text-sm" style={{ padding: '1rem' }}>Belum ada notifikasi.</p>}
          {[...myNotifs].reverse().slice(0, 10).map(n => (
            <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
              <span className="notif-type">{notifIcon(n.type)}</span>
              <div>
                <p className="notif-msg">{n.message}</p>
                <p className="text-secondary" style={{ fontSize: '0.75rem' }}>{formatDate(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function notifIcon(type) {
  const icons = { info: 'ℹ️', payment: '💳', bought: '☕', reminder: '⏰', done: '✅', debt: '💸' };
  return icons[type] || '🔔';
}

// ─── USER PROFILE COMPONENT ──────────────────────────────────────────────────
function UserProfile({ username, onLogout, onShowHistory }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="notif-wrapper">
      <div className="user-chip" onClick={() => setOpen(!open)} title="Profil">
        <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
        <span>{username}</span>
      </div>
      {open && (
        <div className="notif-dropdown profile-dropdown">
          <div className="notif-item" onClick={() => { setOpen(false); onShowHistory(); }} style={{ cursor: 'pointer' }}>
            <span className="notif-type">📋</span>
            <div className="notif-msg" style={{ marginTop: '2px' }}>Histori Order</div>
          </div>
          <div className="notif-item" onClick={() => { setOpen(false); onLogout(); }} style={{ cursor: 'pointer', color: '#B91C1C' }}>
            <span className="notif-type">🚪</span>
            <div className="notif-msg" style={{ marginTop: '2px' }}>Keluar (Logout)</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEPPER COMPONENT (for Penitip) ─────────────────────────────────────────
function Stepper({ steps, currentStep }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={i} className={`step-item ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
          <div className="step-circle">{i < currentStep ? '✓' : i + 1}</div>
          <span className="step-label">{s}</span>
          {i < steps.length - 1 && <div className={`step-line ${i < currentStep ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN PIN GATE ──────────────────────────────────────────────────────────
const ADMIN_PIN_KEY = 'ngopi_admin_pin';

function AdminPinGate({ onSuccess, onClose }) {
  const storedPin = localStorage.getItem(ADMIN_PIN_KEY);
  const isFirstTime = !storedPin;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length < 4) { setError('PIN minimal 4 digit.'); triggerShake(); return; }
    if (isFirstTime) {
      if (pin !== confirmPin) { setError('PIN tidak cocok, coba lagi.'); triggerShake(); setPin(''); setConfirmPin(''); return; }
      localStorage.setItem(ADMIN_PIN_KEY, pin);
      onSuccess();
    } else {
      if (pin !== storedPin) { setError('PIN salah!'); triggerShake(); setPin(''); return; }
      onSuccess();
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={`dialog-box glass-panel pin-gate ${shake ? 'shake' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="pin-icon">{isFirstTime ? '🔐' : '🔒'}</div>
        <h3 className="dialog-title">{isFirstTime ? 'Buat PIN Admin' : 'Masukkan PIN Admin'}</h3>
        <p className="dialog-message text-secondary">
          {isFirstTime
            ? 'Buat PIN untuk melindungi perubahan menu kopi. Simpan PIN ini baik-baik!'
            : 'Manajemen menu hanya untuk admin. Masukkan PIN untuk melanjutkan.'}
        </p>
        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group">
            <label>{isFirstTime ? 'Buat PIN (min. 4 digit)' : 'PIN Admin'}</label>
            <input
              id="admin-pin-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              placeholder="****"
              maxLength={8}
              autoFocus
              required
            />
          </div>
          {isFirstTime && (
            <div className="form-group">
              <label>Konfirmasi PIN</label>
              <input
                id="admin-pin-confirm"
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={e => { setConfirmPin(e.target.value); setError(''); }}
                placeholder="****"
                maxLength={8}
                required
              />
            </div>
          )}
          {error && <p className="pin-error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
            <button id="admin-pin-submit" type="submit" className="btn-primary">
              {isFirstTime ? '\u2705 Simpan PIN' : '\uD83D\uDD13 Masuk'}
            </button>
          </div>
        </form>
        {!isFirstTime && (
          <p className="pin-reset-hint text-secondary text-sm">
            Lupa PIN? Hubungi admin tim kamu.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN MENU MANAGER ───────────────────────────────────────────────────────
function MenuManager({ menu, onSave, onClose }) {
  const [items, setItems] = useState(menu.map(m => ({ ...m })));
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newEmoji, setNewEmoji] = useState('☕');

  const addItem = () => {
    if (!newName || !newPrice) return;
    setItems([...items, { id: 'c' + Date.now(), name: newName, price: parseInt(newPrice) || 0, emoji: newEmoji }]);
    setNewName(''); setNewPrice(''); setNewEmoji('☕');
  };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, val) => setItems(items.map(i => i.id === id ? { ...i, [field]: field === 'price' ? (parseInt(val) || 0) : val } : i));

  return (
    <div className="dialog-overlay">
      <div className="dialog-box glass-panel admin-panel">
        <div className="admin-header">
          <h3>⚙️ Manajemen Menu Kopi</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="menu-list">
          {items.map(item => (
            <div key={item.id} className="menu-edit-row">
              <input className="emoji-input" value={item.emoji} onChange={e => updateItem(item.id, 'emoji', e.target.value)} maxLength={2} />
              <input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Nama menu" />
              <input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} placeholder="Harga" style={{ width: '120px' }} />
              <button className="btn-icon-danger" onClick={() => removeItem(item.id)}>🗑️</button>
            </div>
          ))}
        </div>
        <div className="menu-edit-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
          <input className="emoji-input" value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2} placeholder="☕" />
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama menu baru" />
          <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Harga" style={{ width: '120px' }} />
          <button className="btn-primary btn-small" onClick={addItem}>+ Tambah</button>
        </div>
        <div className="dialog-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={() => { onSave(items); onClose(); }}>Simpan Menu</button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ────────────────────────────────────────────────────────────
function HistoryPanel({ history, payerHistory, onClose }) {
  return (
    <div className="dialog-overlay">
      <div className="dialog-box glass-panel admin-panel" style={{ maxWidth: '700px' }}>
        <div className="admin-header">
          <h3>📋 Histori Sesi & Giliran</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <h4 className="text-secondary mb-4" style={{ marginTop: '1rem' }}>Frekuensi Jadi Pembayar</h4>
        {Object.keys(payerHistory).length === 0 && <p className="text-secondary text-sm">Belum ada data giliran.</p>}
        <div className="payer-history-grid">
          {Object.entries(payerHistory).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
            <div key={name} className="payer-stat-card">
              <span className="payer-name">{name}</span>
              <span className="payer-count">{count}× bayar</span>
              <div className="payer-bar"><div className="payer-fill" style={{ width: `${Math.min(count * 25, 100)}%` }} /></div>
            </div>
          ))}
        </div>
        <h4 className="text-secondary mb-4" style={{ marginTop: '1.5rem' }}>Riwayat Sesi ({history.length} sesi)</h4>
        {history.length === 0 && <p className="text-secondary text-sm">Belum ada sesi selesai.</p>}
        <div className="history-list">
          {[...history].reverse().map(s => (
            <div key={s.id} className="history-card glass-panel">
              <div className="history-header">
                <span className="history-date">{formatDate(s.startedAt)}</span>
                <span className={`history-status ${s.status}`}>{s.status === 'completed' ? '✅ Selesai' : s.status === 'force-closed' ? '⚠️ Tutup Paksa' : s.status}</span>
              </div>
              <div className="history-detail">
                <span>👑 Pembayar: <strong>{s.payer || '-'}</strong></span>
                <span>🛡️ Pendamping: <strong>{s.companion || '-'}</strong></span>
                <span>📦 {s.orders.length} pesanan · Total: <strong>{formatRp(s.orders.reduce((sum, o) => sum + o.item.price, 0))}</strong></span>
                {s.debtors?.length > 0 && <span className="text-red">💸 Belum bayar: {s.debtors.join(', ')}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [store, setStore] = useState(() => loadStore());
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('ngopi_current_user') || '');
  const [loginInput, setLoginInput] = useState('');
  const [view, setView] = useState('home'); // home | session | history | admin

  // Timer
  const [timeLeft, setTimeLeft] = useState(600);
  const timerRef = useRef(null);

  // Dialogs
  const [dialog, setDialog] = useState(null); // { title, message, onConfirm, danger?, confirmText? }
  const [showMenuManager, setShowMenuManager] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form states
  const [selectedCoffeeId, setSelectedCoffeeId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');

  // Sync store with localStorage (simulates real-time)
  const refreshStore = useCallback(() => {
    setStore(loadStore());
  }, []);

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
    const { payer, companion } = selectRoles(participants, s.payerHistory);
    
    await api.updateSession(s.session.id, {
      status: 'payment-setup',
      payer, companion, closedAt: new Date().toISOString()
    });

    participants.forEach(p => {
      api.notify(s.session.id, p, 'info', `Sesi ditutup! Pembayar: ${payer} | Pendamping: ${companion || '-'}`);
    });
    api.notify(s.session.id, payer, 'info', `Kamu terpilih sebagai Pembayar! Silakan lengkapi info pembayaran.`);
  }, []);

  useEffect(() => {
    initSupabaseSync();
    const handler = () => refreshStore();
    window.addEventListener('sync_store', handler);
    // Poll every 3 seconds for same-tab fallback
    const poll = setInterval(refreshStore, 3000);
    return () => { window.removeEventListener('sync_store', handler); clearInterval(poll); };
  }, [refreshStore]);

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

  // Current role of the logged-in user
  const session = store.session;
  const myRole = (() => {
    if (!session || !currentUser) return null;
    if (session.payer === currentUser) return 'payer';
    if (session.companion === currentUser) return 'companion';
    if (session.orders.some(o => o.username === currentUser)) return 'penitip';
    return null;
  })();

  const myOrder = session?.orders.find(o => o.username === currentUser);
  const myNotifs = session?.notifications.filter(n => n.to === currentUser || n.to === 'all') || [];
  // const unreadCount = myNotifs.filter(n => !n.read).length;

  // ─── ACTIONS ───────────────────────────────────────────────────────────────

  const login = (e) => {
    e.preventDefault();
    const name = loginInput.trim();
    if (!name) return;
    setCurrentUser(name);
    localStorage.setItem('ngopi_current_user', name);
    setLoginInput('');
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
    setView('session');
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
      status: 'active', paymentMethod, bankName, accountNo
    });
    await api.incrementPayerCount(payer);

    s.session.orders.forEach(o => {
      if (o.username !== payer) {
        api.notify(s.session.id, o.username, 'payment',
          `💳 Info Transfer: ${paymentMethod}${paymentMethod === 'BANK' ? ` (${bankName})` : ''} – ${accountNo} a.n. ${payer}. Total kamu: ${formatRp(o.item.price)}`
        );
      }
    });

    setPaymentMethod(''); setBankName(''); setAccountNo('');
  };

  const confirmBought = async () => {
    const s = loadStore();
    if (!s.session) return;
    await api.updateSession(s.session.id, { coffeeBought: true });
    s.session.orders.forEach(o => {
      if (o.username !== currentUser) {
         api.notify(s.session.id, o.username, 'bought', `☕ Kopi sudah dibeli oleh ${s.session.payer} dan dalam perjalanan!`);
      }
    });
    setDialog(null);
  };

  const markMyPayment = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, false);
      api.notify(s.session.id, s.session.payer, 'payment', `✅ ${username} sudah konfirmasi pembayaran.`);
      checkSessionComplete(s, order.id);
    }
  };

  const markPaidByPayer = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, true);
      api.notify(s.session.id, username, 'payment', `✅ ${s.session.payer} menandai pembayaranmu sebagai lunas (cash).`);
      checkSessionComplete(s, order.id);
    }
  };

  async function checkSessionComplete(s, newlyPaidOrderId) {
    const others = s.session.orders.filter(o => o.username !== s.session.payer);
    // Simulate current state + the one we just updated
    const allOthersPaid = others.every(o => o.isPaid || o.id === newlyPaidOrderId);
    if (allOthersPaid) {
      await api.updateSession(s.session.id, { status: 'completed' });
      // Build history payload directly from local state (avoid stale loadStore)
      const historyPayload = {
        ...s.session,
        status: 'completed',
        orders: s.session.orders.map(o => ({
          ...o,
          isPaid: o.id === newlyPaidOrderId ? true : o.isPaid
        }))
      };
      await api.saveHistory(s.session.id, historyPayload);
      s.session.orders.forEach(o => {
        api.notify(s.session.id, o.username, 'done', '🎉 Sesi selesai! Semua sudah bayar. Makasih! ☕');
      });
    }
  }

  const forceClose = async () => {
    const s = loadStore();
    if (!s.session) return;
    const debtors = s.session.orders.filter(o => !o.isPaid && o.username !== s.session.payer).map(o => o.username);
    
    await api.updateSession(s.session.id, { status: 'force-closed', forceClosedBy: currentUser, debtors });
    const full = { ...loadStore().session, status: 'force-closed', forceClosedBy: currentUser, debtors };
    await api.saveHistory(s.session.id, full);

    if (debtors.length > 0) {
      debtors.forEach(d => api.notify(s.session.id, d, 'debt', `⚠️ Sesi ditutup paksa. Kamu tercatat belum bayar Rp ${s.session.orders.find(o => o.username === d)?.item.price.toLocaleString()}`));
    }
    s.session.orders.forEach(o => {
       api.notify(s.session.id, o.username, 'done', `Sesi ditutup paksa oleh ${currentUser}.`);
    });
    setDialog(null);
  };

  const finishViewSession = () => {
    setView('home');
  };

  const markNotifsRead = async () => {
    const s = loadStore();
    if (!s.session) return;
    for (const n of s.session.notifications) {
      if ((n.to === currentUser || n.to === 'all') && !n.readBy?.includes(currentUser)) {
        await api.markNotifRead(n.id, currentUser);
      }
    }
  };

  const saveMenu = async (newMenu) => {
    await api.saveMenu(newMenu);
  };

  // ─── RENDER HELPERS ────────────────────────────────────────────────────────

  const stepperSteps = ['Menunggu Pembayar', 'Silakan Bayar', 'Kopi Dibeli', 'Selesai'];
  const getStepIndex = () => {
    if (!session) return 0;
    if (session.status === 'open' || session.status === 'payment-setup') return 0;
    if (session.status === 'active' && !session.coffeeBought) return 1;
    if (session.status === 'active' && session.coffeeBought) return 2;
    if (session.status === 'completed') return 3;
    return 0;
  };

  const totalAmount = session?.orders.reduce((sum, o) => sum + o.item.price, 0) || 0;
  const paidAmount = session?.orders.filter(o => o.isPaid).reduce((sum, o) => sum + o.item.price, 0) || 0;
  const unpaidCount = session?.orders.filter(o => !o.isPaid && o.username !== session.payer).length || 0;
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

  // ─── VIEW: LOGIN ────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-logo text-gradient">NgopiGak?</div>
        </nav>
        <div className="login-screen fade-in">
          <div className="login-card glass-panel">
            <div className="login-icon">☕</div>
            <h2 className="login-title">Siapa Kamu?</h2>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Masukkan nama untuk mulai ngopi bareng</p>
            <form onSubmit={login} className="modern-form">
              <div className="form-group">
                <label>Nama Kamu</label>
                <input
                  id="login-name"
                  type="text"
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  placeholder="Contoh: Budi, Sari, ..."
                  autoFocus
                  required
                />
              </div>
              <button id="login-submit" type="submit" className="btn-primary">Masuk ☕</button>
            </form>
            {loadStore().users.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <p className="text-secondary text-sm" style={{ marginBottom: '0.5rem' }}>Login cepat:</p>
                <div className="quick-login-grid">
                  {loadStore().users.slice(-8).map(u => (
                    <button key={u} className="quick-login-chip" onClick={() => { setCurrentUser(u); localStorage.setItem('ngopi_current_user', u); }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── VIEW: HOME ─────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="hero-section fade-in">
      <div className="hero-content">
        <h1 className="hero-title">
          Sistem Patungan <span className="text-gradient">Premium</span> Ngopi
        </h1>
        <p className="hero-subtitle">
          Titip kopi, pilih pembayar adil berbasis giliran, dan pantau status pembayaran semua anggota tim — semuanya dalam satu tempat.
        </p>
        <div className="hero-actions">
          {!session || sessionDone ? (
            <button id="start-session-btn" className="btn-primary" onClick={startSession}>☕ Buka Sesi Ngopi</button>
          ) : (
            <button id="join-session-btn" className="btn-primary" onClick={() => setView('session')}>
              {session.status === 'open' ? '👋 Join Sesi Aktif' : '🔍 Lihat Sesi Berjalan'}
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowHistory(true)}>📋 Histori</button>
        </div>
        {session && !sessionDone && session.status === 'open' && (
          <div className="session-live-badge">
            <span className="live-dot" /><span>Sesi Aktif</span>
            <span className="live-timer">⏳ {formatTime(timeLeft)} tersisa</span>
            <span>👥 {session.orders.length} orang pesan</span>
          </div>
        )}
      </div>
      <div className="hero-image-container">
        <div className="glow-effect" />
        <div className="hero-image-wrapper glass-panel">
          <img src="/coffee_hero.png" alt="Premium Coffee" className="hero-image" />
        </div>
      </div>
    </div>
  );

  // ─── VIEW: SESSION ──────────────────────────────────────────────────────────
  const renderSession = () => {
    // No session at all
    if (!session) return (
      <div className="empty-state">
        <p className="text-secondary">Belum ada sesi aktif.</p>
        <button className="btn-primary mt-4" onClick={startSession}>☕ Buka Sesi</button>
      </div>
    );

    // SESSION SELESAI — tampilkan layar ringkasan, bukan blank/stuck
    if (session.status === 'completed' || session.status === 'force-closed') {
      const isForced = session.status === 'force-closed';
      const debtors = session.debtors || [];
      return (
        <div className="empty-state fade-in" style={{ padding: '3rem 1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isForced ? '⚠️' : '🎉'}</div>
            <h2 style={{ marginBottom: '0.5rem' }}>{isForced ? 'Sesi Ditutup Paksa' : 'Sesi Selesai!'}</h2>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
              {isForced
                ? `Sesi ditutup oleh ${session.forceClosedBy || 'sistem'}.${debtors.length > 0 ? ` ${debtors.join(', ')} tercatat belum bayar.` : ''}`
                : 'Semua peserta sudah lunas. Terima kasih! ☕'}
            </p>
            {debtors.length > 0 && (
              <div className="no-order-hint glass-panel" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                💸 Belum bayar: <strong>{debtors.join(', ')}</strong>
              </div>
            )}
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setView('home'); }}>
              ☕ Buka Sesi Baru
            </button>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => setView('home')}>
              Kembali ke Home
            </button>
          </div>
        </div>
      );
    }

    // PHASE: Open — order collection
    if (session.status === 'open') {
      return (
        <div className="dashboard-grid fade-in">
          {/* LEFT: Form Order */}
          <div className="panel glass-panel">
            <div className="panel-header">
              <div className="timer-row">
                <h2>🕒 Sesi Terbuka</h2>
                <div className={`timer-chip ${timeLeft < 60 ? 'urgent' : ''}`}>{formatTime(timeLeft)}</div>
              </div>
              <p className="text-secondary">Halo <strong>{currentUser}</strong>! Pilih kopi yang kamu mau.</p>
            </div>
            {myOrder
              ? <div className="my-order-card">
                <span className="text-secondary text-sm">Pesananmu saat ini:</span>
                <div className="my-order-detail">
                  <span>{myOrder.item.emoji} {myOrder.item.name}</span>
                  <strong className="text-accent">{formatRp(myOrder.item.price)}</strong>
                </div>
                <span className="text-secondary text-sm" style={{ marginTop: '0.25rem' }}>Kamu bisa update pesanan di bawah.</span>
              </div>
              : <div className="no-order-hint glass-panel">⚠️ Kamu belum pesan! Order sekarang agar masuk undian jadi pembayar.</div>
            }
            <form onSubmit={addOrder} className="modern-form" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Pilih Menu Kopi</label>
                <select id="coffee-select" value={selectedCoffeeId} onChange={e => setSelectedCoffeeId(e.target.value)} required>
                  <option value="" disabled>-- Pilih Kopi --</option>
                  {store.menu.map(m => (
                    <option key={m.id} value={m.id}>{m.emoji} {m.name} — {formatRp(m.price)}</option>
                  ))}
                </select>
              </div>
              <button id="order-submit" type="submit" className="btn-primary">{myOrder ? '🔄 Update Pesanan' : '+ Tambah Pesanan'}</button>
            </form>
          </div>

          {/* RIGHT: Order List + Close Button */}
          <div className="panel glass-panel split-panel">
            <div className="order-list">
              <h3>Daftar Pesanan ({session.orders.length})</h3>
              <div className="list-container">
                {session.orders.map(o => (
                  <div key={o.id} className={`list-item ${o.username === currentUser ? 'highlight' : ''}`}>
                    <div className="flex-col">
                      <span className="font-bold">{o.username} {o.username === currentUser && <span className="you-tag">Kamu</span>}</span>
                      <span className="text-secondary text-sm">{o.item.emoji} {o.item.name}</span>
                    </div>
                    <span className="font-bold text-accent">{formatRp(o.item.price)}</span>
                  </div>
                ))}
                {session.orders.length === 0 && <p className="text-secondary text-center mt-4">Belum ada pesanan.</p>}
              </div>
            </div>
            <div className="volunteer-section">
              <h3>Tutup Sesi</h3>
              <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                Sistem akan pilih Pembayar & Pendamping secara adil berbasis giliran. Sesi otomatis tutup setelah timer habis.
              </p>
              <button
                id="close-session-btn"
                className="btn-secondary"
                style={{ width: '100%', borderColor: session.orders.length === 0 ? 'var(--red)' : '', color: session.orders.length === 0 ? 'var(--red)' : '' }}
                onClick={closeSessionAndSelectRoles}
              >
                {session.orders.length === 0 ? 'Batalkan Sesi (Kosong) ❌' : 'Tutup Sesi & Pilih Relawan 🎲'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // PHASE: Payment Setup (Payer fills in payment info)
    if (session.status === 'payment-setup') {
      const isPayer = session.payer === currentUser;
      return (
        <div className="dashboard-centered fade-in">
          <div className="panel glass-panel full-width">
            <div className="panel-header text-center">
              <h2>🎉 Relawan Terpilih!</h2>
            </div>
            <div className="volunteer-highlights mb-4">
              <div className="highlight-card bg-accent-glow">
                <span className="badge">👑 PEMBAYAR</span>
                <h3>{session.payer}</h3>
                <span className="text-secondary text-sm">{(store.payerHistory[session.payer] || 0)} kali sebelumnya</span>
              </div>
              {session.companion && (
                <div className="highlight-card">
                  <span className="badge">🛡️ PENDAMPING</span>
                  <h3>{session.companion}</h3>
                </div>
              )}
            </div>

            {isPayer ? (
              <div style={{ padding: '0 1rem' }}>
                <h3 className="mb-4" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                  💳 Lengkapi Info Pembayaran
                </h3>
                <p className="text-secondary mb-4 text-sm">
                  Kamu terpilih sebagai Pembayar! Isi rekening/nomor tujuan transfer agar semua bisa bayar ke kamu.
                </p>
                <form onSubmit={submitPaymentInfo} className="modern-form form-grid">
                  <div className="form-group mb-4">
                    <label>Metode Pembayaran</label>
                    <select id="payment-method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                      <option value="" disabled>-- Pilih Metode --</option>
                      <option value="BANK">🏦 Bank Transfer</option>
                      <option value="GOPAY">🟢 GoPay</option>
                      <option value="DANA">🔵 DANA</option>
                    </select>
                  </div>
                  {paymentMethod === 'BANK' && (
                    <div className="form-group mb-4">
                      <label>Nama Bank</label>
                      <input id="bank-name" type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="BCA, Mandiri, BNI, dll" required />
                    </div>
                  )}
                  <div className="form-group mb-4">
                    <label>{paymentMethod === 'BANK' ? 'Nomor Rekening' : 'Nomor HP / Akun'}</label>
                    <input id="account-no" type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="Masukkan nomor" required />
                  </div>
                  <button id="confirm-payment-btn" type="submit" className="btn-primary" style={{ gridColumn: '1 / -1' }}>
                    Konfirmasi & Kirim Notifikasi 📤
                  </button>
                </form>
              </div>
            ) : (
              <div className="waiting-payer">
                <div className="spinner" />
                <p className="text-secondary">Menunggu <strong>{session.payer}</strong> mengisi info pembayaran...</p>
                <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>Kamu akan diberi tahu begitu info tersedia.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // PHASE: Active & Done — role-based pages
    if (session.status === 'active' || sessionDone) {
      if (myRole === 'payer') return renderPayerPage();
      if (myRole === 'companion') return renderCompanionPage();
      if (myRole === 'penitip') return renderPenitipPage();
      // User who joined but didn't order
      return renderGuestPage();
    }

    return null;
  };

  // ─── PAYER PAGE ─────────────────────────────────────────────────────────────
  const renderPayerPage = () => {
    const nonPayer = session.orders.filter(o => o.username !== session.payer);
    const paidCount = nonPayer.filter(o => o.isPaid).length;

    return (
      <div className="role-layout fade-in">
        <div className="role-header payer-header">
          <span className="role-badge">👑 Kamu Pembayar</span>
          <h2>Dashboard Pembayar</h2>
          <p className="text-secondary">Rekap semua pesanan dan status pembayaran dari setiap peserta.</p>
        </div>

        <div className="dashboard-grid">
          {/* Order Summary */}
          <div className="panel glass-panel">
            <h3 className="section-title">📦 Rekap Pesanan</h3>
            <div className="stats-box mb-4">
              <div className="stat-row"><span>Total Keseluruhan:</span><strong>{formatRp(totalAmount)}</strong></div>
              <div className="stat-row"><span>Terkumpul:</span><strong className="text-green">{formatRp(paidAmount)}</strong></div>
              <div className="stat-row"><span>Sisa Belum Bayar:</span><strong className="text-red">{formatRp(totalAmount - paidAmount)}</strong></div>
              <div className="stat-row"><span>Progress:</span><strong>{paidCount}/{nonPayer.length} orang lunas</strong></div>
            </div>

            <div className="list-container" style={{ maxHeight: 'none', gap: '0.75rem' }}>
              {session.orders.map(o => (
                <div key={o.id} className={`payment-item ${o.isPaid ? 'paid' : ''}`}>
                  <div className="payment-info">
                    <span className="font-bold">{o.username} {o.username === session.payer && <span className="you-tag">Pembayar</span>} {o.username === session.companion && <span className="you-tag companion">Pendamping</span>}</span>
                    <span className="text-secondary text-sm">{o.item.emoji} {o.item.name}</span>
                    <strong className="text-accent">{formatRp(o.item.price)}</strong>
                  </div>
                  <div>
                    {o.username === session.payer ? (
                      <span className="badge-role">Kamu (gratis angkat!)</span>
                    ) : o.isPaid ? (
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge-paid">✅ LUNAS</span>
                        {o.markedByPayer && <p className="text-secondary text-sm" style={{ marginTop: '3px' }}>Cash</p>}
                      </div>
                    ) : (
                      <button id={`mark-paid-${o.username}`} className="btn-primary btn-small" onClick={() => markPaidByPayer(o.username)}>Tandai Lunas</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Payment Info */}
            <div>
              <h3 className="section-title">💳 Info Transfer Kamu</h3>
              <div className="payment-info-card glass-panel">
                <div className="payment-method-tag">{session.paymentInfo.method}</div>
                {session.paymentInfo.bankName && <p><span className="text-secondary">Bank:</span> <strong>{session.paymentInfo.bankName}</strong></p>}
                <p><span className="text-secondary">Nomor:</span> <strong style={{ fontSize: '1.2rem' }}>{session.paymentInfo.accountNo}</strong></p>
                <p><span className="text-secondary">A.n.:</span> <strong>{session.payer}</strong></p>
              </div>
            </div>

            {/* Coffee Bought */}
            {!session.coffeeBought ? (
              <div>
                <h3 className="section-title">☕ Status Pembelian</h3>
                <p className="text-secondary text-sm mb-4">Tekan tombol ini setelah kopi sudah dibeli dan dalam perjalanan.</p>
                <button
                  id="coffee-bought-btn"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setDialog({
                    title: 'Konfirmasi Pembelian',
                    message: 'Apakah kamu sudah membeli semua kopi? Semua peserta akan mendapat notifikasi.',
                    onConfirm: confirmBought,
                    confirmText: '✅ Ya, Kopi Sudah Dibeli!'
                  })}
                >
                  ☕ Kopi Sudah Dibeli
                </button>
              </div>
            ) : (
              <div className="success-banner">
                <span>☕</span>
                <div>
                  <strong>Kopi sudah dibeli!</strong>
                  <p className="text-secondary text-sm">{formatDate(session.coffeeBoughtAt)}</p>
                </div>
              </div>
            )}

            {/* Force Close */}
            {!sessionDone && (
              <div style={{ marginTop: 'auto' }}>
                <button
                  id="force-close-btn"
                  className="btn-danger"
                  style={{ width: '100%' }}
                  onClick={() => setDialog({
                    title: '⚠️ Tutup Paksa Sesi',
                    message: `Total ${unpaidCount} orang belum bayar. Nama mereka akan tercatat sebagai hutang di histori.`,
                    onConfirm: forceClose,
                    confirmText: 'Tutup Paksa',
                    danger: true
                  })}
                >
                  ⚠️ Tutup Paksa Sesi
                </button>
              </div>
            )}

            {sessionDone && (
              <button id="finish-btn" className="btn-secondary" style={{ width: '100%' }} onClick={finishViewSession}>
                Kembali ke Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── COMPANION PAGE ──────────────────────────────────────────────────────────
  const renderCompanionPage = () => {
    const myOrderC = session.orders.find(o => o.username === currentUser);
    return (
      <div className="role-layout fade-in">
        <div className="role-header companion-header">
          <span className="role-badge companion">🛡️ Kamu Pendamping</span>
          <h2>Halaman Pendamping</h2>
          <p className="text-secondary">Kamu menemani {session.payer} belanja kopi hari ini.</p>
        </div>

        <div className="dashboard-grid">
          {/* All Orders (read-only) */}
          <div className="panel glass-panel">
            <h3 className="section-title">📦 Semua Pesanan</h3>
            <div className="stats-box mb-4">
              <div className="stat-row"><span>Total Semua:</span><strong>{formatRp(totalAmount)}</strong></div>
              <div className="stat-row"><span>Terkumpul:</span><strong className="text-green">{formatRp(paidAmount)}</strong></div>
            </div>
            <div className="list-container" style={{ maxHeight: 'none', gap: '0.75rem' }}>
              {session.orders.map(o => (
                <div key={o.id} className={`payment-item ${o.isPaid ? 'paid' : ''}`}>
                  <div className="payment-info">
                    <span className="font-bold">{o.username} {o.username === session.payer && <span className="you-tag">Pembayar</span>} {o.username === currentUser && <span className="you-tag companion">Kamu</span>}</span>
                    <span className="text-secondary text-sm">{o.item.emoji} {o.item.name} — {formatRp(o.item.price)}</span>
                  </div>
                  <span className={o.isPaid ? 'badge-paid' : 'badge-unpaid'}>{o.isPaid ? '✅ Lunas' : '⏳ Belum'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My Action */}
          <div className="panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {session.paymentInfo && (
              <div>
                <h3 className="section-title">💳 Info Transfer ke Pembayar</h3>
                <div className="payment-info-card glass-panel">
                  <div className="payment-method-tag">{session.paymentInfo.method}</div>
                  {session.paymentInfo.bankName && <p><span className="text-secondary">Bank:</span> <strong>{session.paymentInfo.bankName}</strong></p>}
                  <p><span className="text-secondary">Nomor:</span> <strong style={{ fontSize: '1.2rem' }}>{session.paymentInfo.accountNo}</strong></p>
                  <p><span className="text-secondary">A.n.:</span> <strong>{session.payer}</strong></p>
                </div>
              </div>
            )}

            {session.coffeeBought && (
              <div className="success-banner">
                <span>☕</span><strong>Kopi sudah dibeli dan dalam perjalanan!</strong>
              </div>
            )}

            {myOrderC && !myOrderC.isPaid && session.status === 'active' && (
              <div>
                <h3 className="section-title">✅ Konfirmasi Pembayaranmu</h3>
                <p className="text-secondary text-sm mb-4">
                  Pesananmu: {myOrderC.item.emoji} {myOrderC.item.name} — <strong>{formatRp(myOrderC.item.price)}</strong>
                </p>
                <button id="companion-paid-btn" className="btn-primary" style={{ width: '100%' }} onClick={() => markMyPayment(currentUser)}>
                  ✅ Sudah Bayar
                </button>
              </div>
            )}

            {myOrderC?.isPaid && <div className="success-banner"><span>✅</span><strong>Pembayaranmu sudah dikonfirmasi!</strong></div>}

            {sessionDone && <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto' }} onClick={finishViewSession}>Kembali ke Home</button>}
          </div>
        </div>
      </div>
    );
  };

  // ─── PENITIP PAGE ────────────────────────────────────────────────────────────
  const renderPenitipPage = () => {
    const step = getStepIndex();
    const alreadyPaid = myOrder?.isPaid;

    return (
      <div className="role-layout penitip-layout fade-in">
        <div className="role-header penitip-header">
          <span className="role-badge penitip">📦 Penitip</span>
          <h2>Status Pesananmu</h2>
        </div>

        <div className="penitip-content">
          <Stepper steps={stepperSteps} currentStep={step} />

          <div className="penitip-card glass-panel">
            <h3 className="section-title">☕ Pesananmu</h3>
            {myOrder ? (
              <div className="my-order-display">
                <span className="order-emoji">{myOrder.item.emoji}</span>
                <div>
                  <p className="font-bold" style={{ fontSize: '1.2rem' }}>{myOrder.item.name}</p>
                  <p className="text-accent" style={{ fontSize: '1.4rem', fontWeight: '800' }}>{formatRp(myOrder.item.price)}</p>
                </div>
              </div>
            ) : <p className="text-secondary">Kamu tidak memiliki pesanan di sesi ini.</p>}

            {session.paymentInfo && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 className="text-secondary" style={{ marginBottom: '0.75rem' }}>💳 Transfer ke:</h4>
                <div className="payment-info-card glass-panel">
                  <div className="payment-method-tag">{session.paymentInfo.method}</div>
                  {session.paymentInfo.bankName && <p><span className="text-secondary">Bank:</span> <strong>{session.paymentInfo.bankName}</strong></p>}
                  <p><span className="text-secondary">Nomor:</span> <strong style={{ fontSize: '1.3rem' }}>{session.paymentInfo.accountNo}</strong></p>
                  <p><span className="text-secondary">A.n.:</span> <strong>{session.payer}</strong></p>
                  <p><span className="text-secondary">Total:</span> <strong className="text-accent">{myOrder ? formatRp(myOrder.item.price) : '-'}</strong></p>
                </div>
              </div>
            )}

            {session.coffeeBought && (
              <div className="success-banner" style={{ marginTop: '1rem' }}>
                <span>☕</span><strong>Kopi sudah dibeli! Dalam perjalanan ke kamu.</strong>
              </div>
            )}

            {myOrder && !alreadyPaid && step >= 1 && (
              <button id="penitip-paid-btn" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => markMyPayment(currentUser)}>
                ✅ Sudah Bayar
              </button>
            )}

            {alreadyPaid && (
              <div className="success-banner" style={{ marginTop: '1rem' }}>
                <span>✅</span><strong>Pembayaran dikonfirmasi! Terima kasih. ☕</strong>
              </div>
            )}

            {sessionDone && <button className="btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={finishViewSession}>Kembali ke Home</button>}
          </div>
        </div>
      </div>
    );
  };

  // ─── GUEST PAGE (watching but didn't order) ─────────────────────────────────
  const renderGuestPage = () => (
    <div className="role-layout fade-in">
      <div className="role-header">
        <span className="role-badge">👀 Penonton</span>
        <h2>Kamu tidak ikut di sesi ini</h2>
        <p className="text-secondary">Kamu tidak menitip pesanan, jadi kamu tidak masuk pool relawan.</p>
      </div>
      <div className="panel glass-panel" style={{ maxWidth: '500px', margin: '2rem auto' }}>
        <h3>Status Sesi</h3>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Pem bayar: <strong>{session?.payer || '-'}</strong></p>
        <p className="text-secondary">Pendamping: <strong>{session?.companion || '-'}</strong></p>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>Status: <strong>{session?.status}</strong></p>
        <button className="btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setView('home')}>Kembali</button>
      </div>
    </div>
  );

  // ─── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-logo text-gradient" style={{ cursor: 'pointer' }} onClick={() => setView('home')}>
          NgopiGak?
        </div>
        <div className="nav-links">
          {session && (
            <button className={`btn-nav ${view === 'session' ? 'active' : ''}`} onClick={() => setView('session')}>
              {sessionDone
                ? (session.status === 'completed' ? '✅ Sesi Selesai' : '⚠️ Sesi Ditutup')
                : session.status === 'open'
                  ? `⏳ ${formatTime(timeLeft)}`
                  : myRole === 'payer' ? '👑 Halaman Saya' : myRole === 'companion' ? '🛡️ Halaman Saya' : '📦 Pesanan Saya'}
            </button>
          )}
          <button className="btn-nav" onClick={() => setShowAdminPin(true)}>⚙️ Menu</button>
          <NotifBell notifications={session?.notifications || []} username={currentUser} onMarkRead={markNotifsRead} />
          <UserProfile username={currentUser} onShowHistory={() => setShowHistory(true)} onLogout={() => setDialog({ title: 'Ingin Keluar?', message: 'Apakah kamu yakin ingin logout dan mengganti nama pengguna?', onConfirm: logout, onCancel: () => setDialog(null), danger: true, confirmText: 'Keluar' })} />
        </div>
      </nav>

      <main className="main-content">
        {view === 'home' && renderHome()}
        {view === 'session' && renderSession()}
      </main>

      {/* Dialogs */}
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
      {showAdminPin && (
        <AdminPinGate
          onSuccess={() => { setShowAdminPin(false); setShowMenuManager(true); }}
          onClose={() => setShowAdminPin(false)}
        />
      )}
      {showMenuManager && <MenuManager menu={store.menu} onSave={saveMenu} onClose={() => setShowMenuManager(false)} />}
      {showHistory && <HistoryPanel history={store.history} payerHistory={store.payerHistory} onClose={() => setShowHistory(false)} />}
    </div>
  );
}
