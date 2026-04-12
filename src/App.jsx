import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStore, api, initSupabaseSync, selectRoles } from './store.js';
import {
  Bell, Info, CreditCard, Coffee, Clock, CheckCircle, AlertTriangle, LogOut, ClipboardList,
  Lock, Unlock, LogIn, History, X, Trash2, PlusCircle, Shield, Users, User, ChevronDown, ChevronLeft,
  Camera, Upload, Loader2, Home, Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

// ─── UTILITY ─────────────────────────────────────────────────────────────────
function formatRp(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
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

function UserAvatar({ username, size = 32 }) {
  const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
  return (
    <div className="user-avatar-wrapper" style={{ width: size, height: size }}>
      <img src={avatarUrl} alt={username} />
    </div>
  );
}

function StatusBadge({ isPaid }) {
  return (
    <span style={{
      fontSize: '0.6rem',
      fontWeight: 800,
      padding: '4px 10px',
      borderRadius: '8px',
      background: isPaid ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      color: isPaid ? '#4ade80' : '#ef4444',
      display: 'inline-block',
      letterSpacing: '0.05em'
    }}>
      {isPaid ? 'LUNAS' : 'HUTANG'}
    </span>
  );
}

// ─── DIALOG COMPONENT ─────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Ya, Lanjutkan', danger = false }) {
  return (
    <div className="bottom-sheet-overlay" onClick={onCancel}>
      <div className="bottom-sheet-container fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-handle"></div>
        <div className="bottom-sheet-content">
          <h3 className="bottom-sheet-title">{title}</h3>
          <p className="bottom-sheet-message text-secondary">{message}</p>
          <div className="bottom-sheet-actions">
            <button className="btn-secondary-pill" onClick={onCancel}>Batal</button>
            <button className={danger ? 'btn-danger-pill' : 'btn-primary-pill'} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATION VIEW ────────────────────────────────────────────────────────
function NotificationView({ notifications, username, onAction }) {
  const myNotifs = notifications.filter(n => n.to === username || n.to === 'all');
  
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

// ─── ORDER DETAIL VIEW ────────────────────────────────────────────────────────
function OrderDetailView({ order, currentUser, api, onBack }) {
  if (!order) return (
    <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <AlertTriangle size={48} className="text-secondary opacity-50 mb-4" />
      <p className="text-secondary">Data pesanan tidak ditemukan.</p>
      <button className="btn-primary mt-4" onClick={onBack}>Kembali</button>
    </div>
  );
  
  const [isUploading, setIsUploading] = useState(false);
  const [localProof, setLocalProof] = useState(order?.paymentProof || '');
  const [localIsPaid, setLocalIsPaid] = useState(order?.isPaid || false);
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    if (!order) return;
    const s = loadStore();
    let sess = null;
    if (order.sessionId === 'active') {
      sess = s.session;
    } else {
      sess = s.history.find(h => h.id === order.sessionId);
    }
    setSessionInfo(sess);
  }, [order]);

  if (!order) return null;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await api.uploadProof(file);
      if (order.sessionId === 'active') {
        const s = loadStore();
        const activeOrder = s.session.orders.find(o => o.username === currentUser);
        if (activeOrder) {
          await api.updateOrder(activeOrder.id, { paymentProof: url });
        }
      } else {
        await api.updateHistoricalOrder(order.sessionId, currentUser, { paymentProof: url });
      }
      setLocalProof(url);
    } catch (err) {
      alert("Gagal upload: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmPay = async () => {
    const prevPaid = localIsPaid;
    setLocalIsPaid(true); // Optimistic
    try {
      if (order.sessionId === 'active') {
        const s = loadStore();
        const activeOrder = s.session?.orders?.find(o => (o.username || '').toLowerCase() === (currentUser || '').toLowerCase());
        if (activeOrder) {
          await api.updateOrder(activeOrder.id, { isPaid: true, markedByPayer: false });
          api.notify(s.session.id, s.session.payer, 'payment', `${currentUser} telah membayar & upload bukti.`);
        }
      } else {
        await api.updateHistoricalOrder(order.sessionId, currentUser, { isPaid: true });
      }
      alert("Konfirmasi pembayaran terkirim!");
    } catch (err) {
      setLocalIsPaid(prevPaid); // Rollback
      alert("Gagal konfirmasi: " + err.message);
    }
  };

  return (
    <div className="order-detail-view fade-in" style={{ padding: '1rem' }}>
      <div className="view-header" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="glass-panel" style={{ padding: '8px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-gradient">Detail Pesanan</h2>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', borderRadius: '32px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'var(--surface)', width: '100px', height: '100px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          {order.item?.emoji || '☕'}
        </div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{order.item?.name || 'Item'}</h3>
        <p className="text-accent" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '2rem' }}>{formatRp(order.item?.price)}</p>

        <div style={{ background: 'var(--bg-primary)', borderRadius: '24px', padding: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
            <span className="text-secondary">Waktu Sesi</span>
            <strong>{formatDate(order.sessionDate).split(',')[0]}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
            <span className="text-secondary">Payer</span>
            <strong>{order.payer}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', fontSize: '0.9rem' }}>
            <span className="text-secondary">Status</span>
            <StatusBadge isPaid={localIsPaid} />
          </div>
        </div>
      </div>

      {!localIsPaid && (
        <div className="payment-management fade-in">
          {sessionInfo?.paymentInfo ? (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--accent-primary)', background: 'rgba(230, 145, 56, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Info Transfer</h4>
                <span className="badge badge-amber">{sessionInfo.paymentInfo.method}</span>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{sessionInfo.paymentInfo.accountNo}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>{sessionInfo.paymentInfo.bankName || 'Digital Wallet'}</p>
                </div>
                <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.7rem' }} onClick={() => { navigator.clipboard.writeText(sessionInfo.paymentInfo.accountNo); alert('Disalin!'); }}>Salin</button>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Menunggu info pembayaran dari <strong>{order.payer}</strong>...</p>
            </div>
          )}

          <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Upload Bukti Bayar</h4>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '32px' }}>
            <label className="upload-box-new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '2px dashed var(--glass-border)', borderRadius: '24px', padding: '2rem', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
              <div style={{ textAlign: 'center' }}>
                {isUploading ? <Loader2 size={32} className="animate-spin text-accent" /> : localProof ? <CheckCircle size={32} className="text-green" /> : <Camera size={32} className="text-secondary" />}
                <p style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600 }}>{localProof ? 'Ganti Foto' : 'Pilih Foto'}</p>
              </div>
            </label>

            {localProof && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                  <img src={localProof} alt="Bukti" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} />
                </div>
                <button className="btn-primary" style={{ width: '100%', height: '56px', borderRadius: '20px' }} onClick={handleConfirmPay}>Konfirmasi Bayar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {localIsPaid && (
        <div className="glass-panel fade-in" style={{ padding: '2.5rem 1.5rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', textAlign: 'center', borderRadius: '32px' }}>
          <div style={{ background: '#4ade80', width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'white' }}>
            <CheckCircle size={32} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Pesanan Sudah Lunas</h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Terima kasih sudah bayar tepat waktu! Kamu keren.</p>
          {localProof && (
            <div style={{ marginTop: '2rem', opacity: 0.6 }}>
               <p className="text-secondary" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>Bukti terupload:</p>
               <img src={localProof} alt="Proof" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stepper({ steps, currentStep }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={i} className={`step-item ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
          <div className="step-circle">{i < currentStep ? '' : i + 1}</div>
          <span className="step-label">{s}</span>
          {i < steps.length - 1 && <div className={`step-line ${i < currentStep ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN PIN GATE ──────────────────────────────────────────────────────────
function AdminPinGate({ serverPin, onSuccess, onClose }) {
  const isFirstTime = !serverPin;

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
    if (pin.length < 4) {
      setError('PIN minimal 4 digit.');
      triggerShake();
      return;
    }
    if (isFirstTime) {
      if (pin !== confirmPin) {
        setError('PIN tidak cocok, coba lagi.');
        triggerShake();
        setPin('');
        setConfirmPin('');
        return;
      }
      api.saveAdminPin(pin);
      onSuccess();
    } else {
      if (pin !== serverPin) {
        setError('PIN salah!');
        triggerShake();
        setPin('');
        return;
      }
      onSuccess();
    }
  };

  return (
    <div className="pin-view-container fade-in">
      <div className={`pin-view-card ${shake ? 'shake' : ''}`}>
        <div className="pin-view-icon">
          {isFirstTime ? <Lock size={32} /> : <Shield size={32} />}
        </div>

        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 800 }}>
          {isFirstTime ? 'Buat PIN Admin' : 'Masukkan PIN Admin'}
        </h2>

        <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {isFirstTime
            ? 'Buat PIN untuk melindungi manajemen menu & user. Simpan PIN ini baik-baik!'
            : 'Manajemen ini hanya untuk admin. Masukkan PIN untuk melanjutkan.'}
        </p>

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {isFirstTime ? 'BUAT PIN KEAMANAN' : 'PIN KEAMANAN'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              autoFocus
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                setPin(val);
                if (error) setError('');
              }}
              placeholder="••••"
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              maxLength={8}
              required
            />
          </div>

          {isFirstTime && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>KONFIRMASI PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                maxLength={8}
                required
              />
            </div>
          )}

          {error && <p className="text-red mb-4 font-bold animate-pulse" style={{ fontSize: '0.85rem' }}>{error}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button type="submit" className="btn-primary-pill" style={{ height: '56px' }}>
              {isFirstTime ? 'Simpan PIN' : 'Masuk Control Center'}
            </button>
            <button type="button" className="btn-logout" style={{ background: 'transparent' }} onClick={onClose}>
              Kembali ke Beranda
            </button>
          </div>
        </form>

        {!isFirstTime && (
          <p className="text-secondary mt-8" style={{ fontSize: '0.75rem' }}>
            Lupa PIN? Hubungi admin tim kamu.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL (MENU & USERS) ──────────────────────────────────────────────
function AdminView({ menu, users, history, activeSession, onSaveMenu, onResetPin, onForceClose, onDeleteActiveSession, onDeleteHistory, onUpdateHistoricalOrder, onDeleteAllNotifs, onSaveAdminPin, setDialog }) {
  const [tab, setTab] = useState('menu');
  const [items, setItems] = useState(menu.map(m => ({ ...m })));
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newEmoji, setNewEmoji] = useState('');

  const addItem = () => {
    if (!newName || !newPrice) return;
    setItems([...items, { id: 'c' + Date.now(), name: newName, price: parseInt(newPrice) || 0, emoji: newEmoji }]);
    setNewName(''); setNewPrice(''); setNewEmoji('');
  };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, val) => setItems(items.map(i => i.id === id ? { ...i, [field]: field === 'price' ? (parseInt(val) || 0) : val } : i));

  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(null);

  return (
    <div className="admin-view fade-in">
      <div className="admin-container">
        <div className="view-header">
          <h2 className="text-gradient"><Shield size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Panel Admin</h2>
        </div>

        <div className="admin-tabs-modern">
          <button className={`admin-tab-item ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>☕ Menu</button>
          <button className={`admin-tab-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 User</button>
          <button className={`admin-tab-item ${tab === 'session' ? 'active' : ''}`} onClick={() => setTab('session')}>⚡ Sesi Aktif</button>
          <button className={`admin-tab-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📜 Riwayat</button>
          <button className={`admin-tab-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>⚙️ Pengaturan</button>
        </div>

        <div className="admin-content-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'menu' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 800 }}>Daftar Menu Kopi</h4>
                <div className="menu-list">
                  {items.map(item => (
                    <div key={item.id} className="admin-list-item">
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                        <input className="emoji-input" style={{ width: '40px', background: 'transparent', border: 'none', textAlign: 'center' }} value={item.emoji} onChange={e => updateItem(item.id, 'emoji', e.target.value)} maxLength={2} />
                        <input style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, flex: 1 }} value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Nama menu" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', textAlign: 'right', color: '#fff' }} value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} placeholder="Harga" />
                        <button className="btn-icon-danger" style={{ padding: '8px' }} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

                <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, opacity: 0.7 }}>+ Tambah Menu Baru</h4>
                <div className="admin-list-item" style={{ background: 'rgba(var(--accent-primary-rgb), 0.05)', borderColor: 'rgba(var(--accent-primary-rgb), 0.1)' }}>
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <input className="emoji-input" style={{ width: '40px', background: 'transparent', border: 'none', textAlign: 'center' }} value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2} placeholder="☕" />
                    <input style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, flex: 1 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama menu baru" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', textAlign: 'right', color: '#fff' }} value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Harga" />
                    <button className="btn-primary btn-small" style={{ borderRadius: '10px' }} onClick={addItem}>Add</button>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '10px' }}>
                  <button className="btn-primary-pill" style={{ flex: 1 }} onClick={() => { onSaveMenu(items); alert("Menu berhasil diperbarui!"); }}>Simpan Perubahan Menu</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Manajemen User</h4>
                <div className="user-list">
                  {users.map(u => {
                    let debt = 0;
                    history.forEach(session => {
                      if (session?.debtors?.some(d => (d || '').toLowerCase() === (u.username || '').toLowerCase())) {
                        const order = session.orders?.find(o => (o.username || '').toLowerCase() === (u.username || '').toLowerCase());
                        debt += order?.item?.price || 0;
                      }
                    });
                    return (
                      <div key={u.username} className="admin-list-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <UserAvatar username={u.username} size={36} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.username}</span>
                            <span className={debt > 0 ? 'text-red' : 'text-green'} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {debt > 0 ? `Hutang: ${formatRp(debt)}` : 'Lunas'}
                            </span>
                          </div>
                        </div>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '10px' }} onClick={() => {
                          setDialog({
                            title: 'Reset PIN?',
                            message: `PIN untuk ${u.username} akan diubah menjadi '1234'.`,
                            onConfirm: () => { onResetPin(u.username); setDialog(null); }
                          });
                        }}>Reset PIN</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'session' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Sesi Aktif</h4>
                {activeSession ? (
                  <div style={{ padding: '1.25rem', background: 'rgba(230, 145, 56, 0.05)', borderRadius: '20px', border: '1px solid rgba(230, 145, 56, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span className="admin-stat-badge" style={{ background: 'rgba(230, 145, 56, 0.2)', color: 'var(--accent-primary)' }}>RUNNING</span>
                      <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{formatDate(activeSession.startedAt)}</span>
                    </div>

                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Pembuat:</span>
                      <span style={{ fontWeight: 700 }}>{activeSession.startedBy}</span>
                    </div>
                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Jumlah Pesanan:</span>
                      <span style={{ fontWeight: 700 }}>{activeSession.orders.length} Item</span>
                    </div>
                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Status:</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{activeSession.status.toUpperCase()}</span>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button className="btn-danger-pill" onClick={() => {
                        setDialog({
                          title: 'Tutup Paksa?',
                          message: 'Hutang peserta akan dicatat. Sesi akan dipindahkan ke histori.',
                          onConfirm: () => { onForceClose(); setDialog(null); },
                          danger: true,
                          confirmText: 'Ya, Tutup'
                        });
                      }}>Tutup Paksa & Simpan Histori</button>

                      <button className="btn-logout" style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.8rem' }} onClick={() => {
                        setDialog({
                          title: 'Hapus Sesi?',
                          message: 'HAPUS PERMANEN? Data pesanan akan hilang total dan tidak masuk histori.',
                          onConfirm: () => { onDeleteActiveSession(activeSession.id); setDialog(null); },
                          danger: true,
                          confirmText: 'Hapus Total'
                        });
                      }}>Hapus Total (Tanpa Histori)</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
                    <Coffee size={48} style={{ marginBottom: '1rem' }} />
                    <p>Tidak ada sesi aktif saat ini.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Manajemen Histori</h4>
                {history.length === 0 ? (
                  <p style={{ textAlign: 'center', opacity: 0.5 }}>Belum ada histori.</p>
                ) : (
                  [...history].reverse().map(h => {
                    const total = h.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
                    const isExpanded = expandedHistoryId === h.id;

                    return (
                      <div key={h.id} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)} style={{ cursor: 'pointer', flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{formatDate(h.startedAt)}</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>Payer: {h.payer} • {formatRp(total)}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-icon-danger" style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)' }} onClick={() => {
                              setDialog({
                                title: 'Hapus Histori?',
                                message: 'Hapus histori sesi ini secara PERMANEN?',
                                onConfirm: () => { onDeleteHistory(h.id); setDialog(null); },
                                danger: true,
                                confirmText: 'Ya, Hapus'
                              });
                            }}><Trash2 size={16} /></button>
                            <button
                              className="btn-icon"
                              style={{ padding: '8px', background: isExpanded ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                              onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                            >
                              <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="fade-in" style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {h.orders.map((ord, idx) => {
                                const isPaid = !h.debtors?.some(d => (d || '').toLowerCase() === (ord.username || '').toLowerCase());
                                return (
                                  <div key={idx} className="admin-list-item" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <UserAvatar username={ord.username} size={24} />
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{ord.username}</span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{ord.item.name}</span>
                                      </div>
                                    </div>
                                    <button
                                      className="admin-stat-badge"
                                      style={{
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: isPaid ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: isPaid ? '#4ade80' : '#f87171'
                                      }}
                                      onClick={async () => {
                                        const key = `${h.id}-${ord.username}`;
                                        setTogglingStatus(key);
                                        try {
                                          await onUpdateHistoricalOrder(h.id, ord.username, { isPaid: !isPaid });
                                        } finally {
                                          setTogglingStatus(null);
                                        }
                                      }}
                                    >
                                      {togglingStatus === `${h.id}-${ord.username}` ? '...' : (isPaid ? 'LUNAS' : 'HUTANG')}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Pengaturan Sistem</h4>
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Ganti PIN Admin</h5>
                  <div className="modern-form">
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <input type="password" style={{ background: 'rgba(0,0,0,0.2)' }} value={newAdminPin} onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="PIN Baru" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <input type="password" style={{ background: 'rgba(0,0,0,0.2)' }} value={confirmAdminPin} onChange={e => setConfirmAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="Konfirmasi PIN" />
                    </div>
                    <button className="btn-primary-pill" style={{ fontSize: '0.85rem' }} onClick={() => {
                      if (newAdminPin.length < 4) { alert("PIN minimal 4 digit."); return; }
                      if (newAdminPin !== confirmAdminPin) { alert("PIN konfirmasi tidak cocok."); return; }
                      onSaveAdminPin(newAdminPin);
                      setNewAdminPin(''); setConfirmAdminPin('');
                      alert("PIN Admin berhasil diperbarui!");
                    }}>Update PIN Admin</button>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#f87171' }}>Pembersihan Data</h5>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '1.25rem' }}>Hapus semua notifikasi lama untuk menjaga kecepatan aplikasi.</p>
                  <button className="btn-logout" style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem' }} onClick={() => {
                    setDialog({
                      title: 'Bersihkan Notif?',
                      message: 'Hapus semua notifikasi secara permanen?',
                      onConfirm: () => { 
                        onDeleteAllNotifs(); 
                        setDialog(null);
                        alert("Semua notifikasi telah dibersihkan.");
                      },
                      danger: true,
                      confirmText: 'Ya, Bersihkan'
                    });
                  }}>Bersihkan Semua Notifikasi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── USER PROFILE EDIT MODAL ──────────────────────────────────────────────────
// ─── USER PROFILE VIEW ────────────────────────────────────────────────────────
function ProfileView({ username, history, onSave, onLogout, payerHistory }) {
  const [name, setName] = useState(username);
  const [isEditing, setIsEditing] = useState(false);

  const usernameLower = (username || '').toLowerCase();
  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));
  
  // Stats
  const mySessions = validHistory.filter(s => s.orders.some(o => (o.username || '').toLowerCase() === usernameLower));
  const myDebts = mySessions.filter(s => s.debtors?.some(d => (d || '').toLowerCase() === usernameLower));
  
  const totalOwed = myDebts.reduce((acc, s) => {
    const myOrder = s.orders.find(o => (o.username || '').toLowerCase() === usernameLower);
    return acc + (myOrder?.item?.price || 0);
  }, 0);

  const totalCoffee = mySessions.reduce((acc, s) => {
    const count = s.orders.filter(o => (o.username || '').toLowerCase() === usernameLower).length;
    return acc + count;
  }, 0);

  const stats = payerHistory && (payerHistory[username] || payerHistory[usernameLower]) || { pay: 0, companion: 0 };

  const handleSave = () => {
    onSave(username, name);
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
               <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>Ngopi Sejak {mySessions.length > 0 ? formatDate(mySessions[mySessions.length - 1].startedAt).split(',')[0] : 'Hari Ini'}</p>
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
             <h3>{stats.pay} <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>Kali</small></h3>
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

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ history, payerHistory, currentUser, onSelectSession }) {
  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));
  const displayedHistory = validHistory;

  return (
    <div className="history-view fade-in" style={{ padding: '1.5rem' }}>
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="text-gradient"><History size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Histori Sesi</h2>
      </div>

      <div className="history-list">
        {displayedHistory.length === 0 ? (
          <div className="empty-state-card">
            <History size={48} className="text-secondary opacity-20 mb-4" />
            <p>Belum ada histori sesi.</p>
          </div>
        ) : (
          [...displayedHistory].reverse().map(s => {
            const userLower = (currentUser || '').toLowerCase();
            const isDbt = s.debtors?.some(d => (d || '').toLowerCase() === userLower);
            const totalAmount = s.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;

            return (
              <div key={s.id} className="history-card-wrapper" style={{ marginBottom: '12px' }}>
                <div
                  className="item-card glass-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '24px',
                    cursor: 'pointer',
                    borderLeft: isDbt ? '4px solid #ef4444' : '1px solid var(--glass-border)'
                  }}
                  onClick={() => onSelectSession(s)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      background: 'var(--bg-primary)', 
                      padding: '10px', 
                      borderRadius: '16px',
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Coffee size={22} className="text-accent" />
                    </div>
                    <div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{formatDate(s.startedAt).split(',')[0]}</p>
                      <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>
                        {s.orders.length} Peserta • {s.payer}{s.companion ? ` & ${s.companion}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>{formatRp(totalAmount)}</p>
                    <StatusBadge isPaid={!isDbt} />
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

// ─── HISTORY DETAIL VIEW ──────────────────────────────────────────────────────
function HistoryDetailView({ session, onBack, currentUser, api }) {
  if (!session) return null;

  const orders = Array.isArray(session?.orders) ? session.orders : [];
  const totalSession = orders.reduce((sum, o) => sum + (o.item?.price || 0), 0);

  return (
    <div className="history-detail-view fade-in" style={{ padding: '1rem' }}>
      <div className="detail-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
        <button className="glass-panel" style={{ padding: '8px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-gradient">Detail Sesi</h2>
      </div>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '32px', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Tanggal Sesi</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatDate(session.startedAt)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Total Putaran</span>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatRp(totalSession)}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '20px' }}>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>PEMBAYAR UTAMA</span>
            <p style={{ fontWeight: 800 }}>{session.payer}</p>
          </div>
          <div>
            <span className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>PENDAMPING</span>
            <p style={{ fontWeight: 800 }}>{session.companion || '-'}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', paddingLeft: '4px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daftar Pesanan ({session.orders.length})</h4>
      </div>

      <div className="card-stack" style={{ marginBottom: '2rem' }}>
        {session.orders.map((o, idx) => {
          const orderDebt = session.debtors?.some(d => (d || '').toLowerCase() === (o.username || '').toLowerCase());
          return (
            <div 
              key={idx} 
              className="item-card glass-panel" 
              style={{ padding: '12px 16px', borderRadius: '24px', cursor: 'pointer' }}
              onClick={() => {
                setSelectedOrder({
                  ...o,
                  sessionDate: session.startedAt,
                  payer: session.payer,
                  isPaid: !orderDebt,
                  sessionId: session.id
                });
                setView('order-detail');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserAvatar username={o.username} size={36} />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item.name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatRp(o.item.price)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                   {o.paymentProof && <Camera size={12} className="text-secondary" />}
                   <span style={{ fontSize: '0.65rem', fontWeight: 800, color: orderDebt ? '#ef4444' : '#4ade80' }}>
                     {orderDebt ? 'HUTANG' : 'LUNAS'}
                   </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [store, setStore] = useState(() => loadStore());
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('ngopi_current_user') || '');
  const [loginInput, setLoginInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [view, setView] = useState('home'); // home | orders | live-session | history | history-detail | profile
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null); // Used for Detail Order view
  const [historyFilter, setHistoryFilter] = useState('all'); // all | my-debt
  const [expandedSession, setExpandedSession] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null); // 'notif' | 'profile' | null

  // Timer
  const [timeLeft, setTimeLeft] = useState(600);
  const timerRef = useRef(null);
  const coffeeDropdownRef = useRef(null);
  const [renderError, setRenderError] = useState(null);

  // Dialogs
  const [dialog, setDialog] = useState(null); // { title, message, onConfirm, danger?, confirmText? }
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Form states
  const [selectedCoffeeId, setSelectedCoffeeId] = useState('');
  const [coffeeSearch, setCoffeeSearch] = useState('');
  const [showMenuResults, setShowMenuResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [proofInput, setProofInput] = useState(''); // and also for active session
  const [isUploadingActive, setIsUploadingActive] = useState(false);

  // Sync store with localStorage (simulates real-time)
  const refreshStore = useCallback(() => {
    try {
      setStore(loadStore());
    } catch (err) {
      console.error("Store refresh failed:", err);
      setRenderError(err.message);
    }
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

    // Find last roles from history to exclude them
    const sortedHistory = [...s.history].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const lastSession = sortedHistory[0];
    const lastRoles = lastSession ? { payer: lastSession.payer, companion: lastSession.companion } : null;

    const { payer, companion } = selectRoles(participants, s.payerHistory, lastRoles);
    console.log("ROLES SELECTED:", { payer, companion });

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
    initSupabaseSync().catch(err => {
      console.error("Supabase initialization error:", err);
      setRenderError(err.message);
    });
    const handler = () => refreshStore();
    window.addEventListener('sync_store', handler);
    // Poll every 3 seconds for same-tab fallback
    const poll = setInterval(refreshStore, 3000);
    return () => { window.removeEventListener('sync_store', handler); clearInterval(poll); };
  }, [refreshStore]);

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

  // Current role of the logged-in user
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
  // const unreadCount = myNotifs.filter(n => !n.read).length;

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
  };

  const markMyPayment = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, false);
      api.notify(s.session.id, s.session.payer, 'payment', `${username} sudah bayar (menunggu verifikasi).`);
      checkSessionComplete(s, order.id);
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
      checkSessionComplete(s, order.id);
    }
  };

  async function checkSessionComplete(s, newlyPaidOrderId) {
    const others = s.session.orders.filter(o => o.username !== s.session.payer);
    const allOthersPaid = others.every(o => o.isPaid || o.id === newlyPaidOrderId);
    if (allOthersPaid) {
      alert('Selamat Ngopi! Semua pembayaran sudah lunas.');
      setView('home');
      try {
        await api.updateSession(s.session.id, { status: 'completed' });
        const historyPayload = {
          ...s.session,
          status: 'completed',
          companion: s.session.companion, // Ensure it's not nullified
          orders: s.session.orders.map(o => ({
            ...o,
            isPaid: o.id === newlyPaidOrderId ? true : o.isPaid
          }))
        };
        await api.saveHistory(s.session.id, historyPayload);
        await api.deleteActiveSession(s.session.id);
        s.session.orders.forEach(o => {
          api.notify(s.session.id, o.username, 'done', 'Sesi ngopi selesai! Makasih sudah patungan adil.');
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

  const totalAmount = session?.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
  const paidAmount = session?.orders?.filter(o => o.isPaid).reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
  const unpaidCount = session?.orders?.filter(o => !o.isPaid && (o.username || '').toLowerCase() !== (session.payer || '').toLowerCase()).length || 0;
  const sessionDone = session?.status === 'completed' || session?.status === 'force-closed';

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
    <div className="home-view fade-in" style={{ padding: '1rem' }}>
      <div className="welcome-section" style={{ marginBottom: '2rem' }}>
        <p className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Selamat Pagi,</p>
        <h2 style={{ fontSize: '1.8rem' }}>{currentUser}! 👋</h2>
      </div>

      {/* Dynamic Session Section */}
      {session && (session.status === 'open' || session.status === 'active' || session.status === 'payment-setup') ? (
        <div className="live-dashboard glass-panel fade-in">
          <div className="live-indicator">
            <div className="pulsing-dot"></div>
            {sessionDone ? 'SESI BERAKHIR' : `LIVE SESI • ${session.status === 'open' ? formatTime(timeLeft) : 'Payment Ready'}`}
          </div>
          
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>{sessionDone ? 'Ringkasan Sesi Hari Ini ☕' : 'Ditunggu kopinya! ☕'}</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
             <div style={{ position: 'relative' }}>
                <UserAvatar username={session.payer} size={56} />
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--accent-primary)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                   <Shield size={10} color="white" />
                </div>
             </div>
             <div>
                <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Payer Utama</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800 }}>{session.payer}</p>
             </div>
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
            onClick={startSession}
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
          <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{store.history.length}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderRadius: '24px' }}>
          <div style={{ background: 'rgba(230, 145, 56, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Coffee size={14} className="text-accent" />
          </div>
          <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Kopi Dipesan</span>
          <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{store.history.filter(s => s.orders.some(o => o.username === currentUser)).length}</p>
        </div>
      </div>
    </div>
  );

  const renderMyOrders = () => {
    // Collect all orders for currentUser across history and active session
    const allPersonalOrders = [];

    // Past orders from history
    store.history.forEach(s => {
      const myOrder = s.orders.find(o => o.username === currentUser);
      if (myOrder) {
        allPersonalOrders.push({
          ...myOrder,
          sessionDate: s.startedAt,
          payer: s.payer,
          isPaid: !s.debtors?.includes(currentUser),
          sessionId: s.id
        });
      }
    });

    // Active session order if exists
    if (session && !sessionDone) {
      const myActiveOrder = session.orders.find(o => o.username === currentUser);
      if (myActiveOrder) {
        allPersonalOrders.push({
          ...myActiveOrder,
          sessionDate: session.startedAt,
          payer: session.payer,
          isPaid: myActiveOrder.isPaid || false,
          sessionId: 'active',
          isLive: true
        });
      }
    }

    return (
      <div className="orders-view fade-in" style={{ padding: '1rem' }}>
        <div className="view-header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="text-gradient">My Order</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Daftar kopi yang pernah kamu pesan.</p>
        </div>

        <div className="card-stack">
          {allPersonalOrders.length === 0 ? (
            <div className="glass-panel empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <Coffee size={48} className="text-secondary opacity-20 mb-4" />
              <p className="text-secondary">Belum ada pesanan.</p>
            </div>
          ) : (
            [...allPersonalOrders].reverse().map((o, idx) => (
              <div key={idx} className="item-card glass-panel" onClick={() => { setSelectedOrder(o); setView('order-detail'); }} style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px', 
                borderRadius: '24px',
                cursor: 'pointer',
                marginBottom: '12px',
                borderLeft: o.isPaid ? '1px solid var(--glass-border)' : '4px solid #ef4444'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    background: 'var(--bg-primary)', 
                    padding: '10px', 
                    borderRadius: '16px', 
                    fontSize: '1.2rem',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {o.item.emoji || '☕'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{o.item.name}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.75rem', margin: 0 }}>
                      {formatDate(o.sessionDate).split(',')[0]} • {o.isLive ? 'Sesi Aktif' : `Dibayar oleh ${o.payer}`}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>{formatRp(o.item.price)}</p>
                  <StatusBadge isPaid={o.isPaid} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ─── VIEW: SESSION ──────────────────────────────────────────────────────────
  /**
   * FORMALIZED ORDER CYCLE:
   * 1. open: Users adding items, timer running.
   * 2. payment-setup: Timer expires or admin closes. Payer picked, fills bank info.
   * 3. active: Payment phase. Users upload proof, Payer verifies.
   * 4. terminal (completed/force-closed): Archived to history and deleted from active.
   */
  const renderSession = () => {
    if (!session) return (
      <div className="empty-state fade-in" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
          <Coffee size={40} className="text-secondary" />
        </div>
        <h2 className="text-secondary">Belum ada sesi</h2>
        <p className="text-secondary" style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>Mulai sesi ngopi sekarang untuk berbagi bareng teman.</p>
        <button className="btn-primary" onClick={startSession}>Buka Sesi Baru</button>
      </div>
    );

    if (session.status === 'completed' || session.status === 'force-closed') {
      const isForced = session.status === 'force-closed';
      const orders = session.orders || [];
      const totalSession = orders.reduce((sum, o) => {
        if (!o || !o.item) return sum;
        return sum + (o.item.price || 0);
      }, 0);
      return (
        <div className="session-summary fade-in" style={{ padding: '1.5rem' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ color: isForced ? 'var(--accent-primary)' : '#4ade80', marginBottom: '1.5rem' }}>
              {isForced ? <AlertTriangle size={64} /> : <CheckCircle size={64} />}
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>{isForced ? 'Sesi Ditutup' : 'Sesi Selesai!'}</h2>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>
              {isForced ? 'Ditutup sebelum semua bayar.' : 'Semua pesanan sudah lunas.'}
            </p>

            <div className="stats-list" style={{ background: 'var(--bg-primary)', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="text-secondary">Total Putaran</span>
                <strong style={{ fontSize: '1.1rem' }}>{formatRp(totalSession)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-secondary">Peserta</span>
                <strong style={{ fontSize: '1.1rem' }}>{(session.orders || []).length} orang</strong>
              </div>
            </div>

            <button className="btn-primary" onClick={() => setView('home')}>Kembali ke Home</button>
          </div>
        </div>
      );
    }

    if (session.status === 'open') {
      return (
        <div className="session-open-view fade-in" style={{ padding: '1rem' }}>
          <div className="glass-panel" style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <div 
               className={`timer-chip ${timeLeft < 60 ? 'urgent' : ''}`} 
               style={{ 
                  position: 'absolute', 
                  top: '16px', 
                  right: '16px', 
                  background: 'var(--bg-primary)', 
                  padding: '6px 14px', 
                  borderRadius: '12px', 
                  fontWeight: 900,
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
               }}
            >
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Sesi Terbuka</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Pilih kopi kamu sebelum timer habis.</p>

            <form onSubmit={addOrder} style={{ marginTop: '1.5rem' }}>
              <div className="form-group modern-form">
                <div className="searchable-dropdown" ref={coffeeDropdownRef} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Cari kopi..."
                    value={coffeeSearch}
                    onFocus={() => setShowMenuResults(true)}
                    onChange={(e) => setCoffeeSearch(e.target.value)}
                    style={{ borderRadius: '20px', paddingRight: '40px' }}
                  />
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                    <ChevronDown size={20} />
                  </div>
                  {showMenuResults && (
                    <div className="glass-panel dropdown-results" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100, maxHeight: '250px', overflowY: 'auto', padding: '8px' }}>
                      {(store.menu || []).filter(m => m && m.name.toLowerCase().includes(coffeeSearch.toLowerCase())).map(m => (
                        <div key={m.id} className="dropdown-item" onClick={() => { setSelectedCoffeeId(m.id); setCoffeeSearch(`${m.emoji} ${m.name}`); setShowMenuResults(false); }} style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{m.emoji} {m.name}</span>
                          <span className="text-accent">{formatRp(m.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button className="btn-primary" type="submit" style={{ borderRadius: '20px', marginTop: '1.25rem' }}>
                {myOrder ? 'Update Pesanan' : 'Tambah Pesanan'}
              </button>
            </form>
          </div>

          <div className="order-list-section">
            <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Daftar Pesanan ({(session.orders || []).length})</h4>
            <div className="card-stack">
              {(session.orders || []).map(o => (
                <div key={o.id} className={`item-card glass-panel ${o.username === currentUser ? 'active-border' : ''}`} style={{ padding: '12px 16px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserAvatar username={o.username} size={36} />
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                      <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item?.emoji || '☕'} {o.item?.name || 'Item'}</p>
                    </div>
                  </div>
                  <strong className="text-accent">{formatRp(o.item?.price || 0)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-actions" style={{ marginTop: '2rem' }}>
            <button className="btn-secondary" onClick={closeSessionAndSelectRoles} style={{ width: '100%', borderRadius: '20px', borderColor: 'rgba(255,255,255,0.1)' }}>
              Tutup Sesi Sekarang
            </button>
          </div>
        </div>
      );
    }

    if (session.status === 'payment-setup') {
      const isPayer = session.payer === currentUser;
      return (
        <div className="payment-setup fade-in" style={{ padding: '1.5rem' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <h2 style={{ marginBottom: '2rem' }}>Relawan Terpilih!</h2>

            <div className="payer-showcase" style={{ position: 'relative', marginBottom: '2.5rem' }}>
              <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>PEMBAYAR</div>
              <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '30px', border: '2px solid var(--accent-primary)' }}>
                <UserAvatar username={session.payer} size={80} />
                <h3 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{session.payer}</h3>
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                   Sudah bayar {session.payer && store.payerHistory ? (store.payerHistory[session.payer]?.pay || 0) : 0} kali
                </p>
              </div>
            </div>

            {isPayer ? (
              <form onSubmit={submitPaymentInfo} className="modern-form" style={{ textAlign: 'left' }}>
                <h4 style={{ marginBottom: '1rem' }}>Lengkapi Info Transfer</h4>
                <div className="form-group">
                  <label>Metode</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                    <option value="" disabled>Pilih Metode</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="GOPAY">GoPay / ShopeePay</option>
                    <option value="DANA">DANA / OVO</option>
                  </select>
                </div>
                {paymentMethod === 'BANK' && (
                  <div className="form-group"><label>Nama Bank</label><input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Misal: BCA" required /></div>
                )}
                <div className="form-group"><label>Nomor Akun</label><input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="No Rekening / No HP" required /></div>
                <button className="btn-primary" type="submit" style={{ marginTop: '1rem' }}>Konfirmasi & Aktifkan Sesi</button>
              </form>
            ) : (
              <div style={{ opacity: 0.8 }}>
                <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                <p className="text-secondary">Menunggu <strong>{session.payer || 'Pembayar'}</strong> mengisi info pembayaran...</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (session.status === 'active' || sessionDone) {
      if (myRole === 'payer') return renderPayerPage();
      if (myRole === 'companion') return renderCompanionPage();
      if (myRole === 'penitip') return renderPenitipPage();
      return renderGuestPage();
    }
    
    // Safety fallback for unknown status
    return (
      <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <Loader2 size={40} className="animate-spin text-secondary mb-4" />
        <p className="text-secondary">Menyamaikan data...</p>
      </div>
    );
  };

  // ─── PAYER PAGE ─────────────────────────────────────────────────────────────
  const renderPayerPage = () => {
    const orders = session.orders || [];
    const nonPayer = orders.filter(o => o.username !== session.payer);
    const paidCount = nonPayer.filter(o => o.isPaid).length;

    return (
      <div className="payer-view fade-in" style={{ padding: '1rem' }}>
        <div className="glass-panel" style={{ marginBottom: '1.5rem', background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="badge badge-amber">Kamu Pembayar</span>
            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{paidCount}/{nonPayer.length} Lunas</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Total Tagihan</h2>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatRp(totalAmount)}</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={confirmBought} disabled={session.coffeeBought}>
              {session.coffeeBought ? 'Kopi Sudah Dibeli ✅' : 'Kopi Sudah Dibeli'}
            </button>
            <button className="btn-secondary" style={{ padding: '10px' }} onClick={remindAll}><Bell size={18} /></button>
          </div>
        </div>

        <div className="order-management">
          <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Status Peserta</h4>
          <div className="card-stack">
            {(session.orders || []).map(o => (
              <div key={o.id} className="item-card glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <UserAvatar username={o.username} size={40} />
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      {o.username} {o.username === session.payer && <span className="text-accent" style={{ fontSize: '0.7rem' }}>(Kamu)</span>}
                    </p>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item?.emoji || '☕'} {o.item?.name || 'Item'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800, marginBottom: '6px' }}>{formatRp(o.item?.price || 0)}</p>
                  {o.username !== session.payer && (
                    <button
                      className={`badge ${o.isPaid ? 'badge-glass' : 'badge-amber'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => !o.isPaid && markPaidByPayer(o.username)}
                    >
                      {o.isPaid ? 'LUNAS ✅' : 'Tandai Lunas'}
                    </button>
                  )}
                  {o.paymentProof && (
                    <div style={{ marginTop: '4px' }}>
                      <a href={o.paymentProof} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Lihat Bukti</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!sessionDone && (
          <div style={{ marginTop: '2.5rem', paddingBottom: '2rem' }}>
            <button className="btn-secondary" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => setDialog({ title: 'Tutup Paksa?', message: 'Hutang peserta akan dicatat.', onConfirm: forceClose, danger: true, confirmText: 'Ya, Tutup' })}>
              Tutup Paksa Sesi
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── COMPANION PAGE ──────────────────────────────────────────────────────────
  const renderCompanionPage = () => {
    return (
      <div className="companion-view fade-in" style={{ padding: '1rem' }}>
        <div className="glass-panel" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--accent-glow)', width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Users size={32} className="text-accent" />
          </div>
          <span className="badge badge-amber" style={{ marginBottom: '1rem' }}>Kamu Pendamping</span>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Bantu {session.payer} Ambil Kopi!</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Tugas kamu adalah menemani pembayar hari ini ke kedai kopi.</p>
        </div>
        {renderPenitipPage()}
      </div>
    );
  };

  // ─── PENITIP PAGE ────────────────────────────────────────────────────────────
  const renderPenitipPage = () => {
    const alreadyPaid = myOrder?.isPaid;
    const step = getStepIndex();

    return (
      <div className="penitip-view fade-in" style={{ padding: '1rem' }}>
        <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span className="badge badge-glass">Status Pesanan</span>
            {alreadyPaid ? <span className="text-green" style={{ fontSize: '0.8rem', fontWeight: 800 }}>LUNAS ✅</span> : <span className="text-red" style={{ fontSize: '0.8rem', fontWeight: 800 }}>BELUM BAYAR ⏳</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{myOrder?.item?.emoji || '☕'}</div>
            <div>
              <h3 style={{ fontSize: '1.3rem' }}>{myOrder?.item?.name || 'Pesanan'}</h3>
              <p className="text-accent" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatRp(myOrder?.item?.price || 0)}</p>
            </div>
          </div>

          <div className="transfer-info glass-panel" style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Bayar ke {session.payer}:</p>
              <span className="text-accent" style={{ fontSize: '0.7rem', fontWeight: 800 }}>{session.paymentInfo?.method}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px' }}>{session.paymentInfo?.accountNo}</p>
                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{session.paymentInfo?.bankName || 'Digital Wallet'}</p>
              </div>
              <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', width: 'auto' }} onClick={() => { navigator.clipboard.writeText(session.paymentInfo?.accountNo); alert('Nomor disalin!'); }}>Salin</button>
            </div>
          </div>
        </div>

        {!alreadyPaid && (
          <div className="payment-actions">
            <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Upload Bukti Bayar</h4>
            <label className="upload-box-new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--glass-border)', padding: '2.5rem', borderRadius: '24px', cursor: 'pointer', background: proofInput ? 'rgba(74, 222, 128, 0.05)' : 'transparent' }}>
              <input type="file" accept="image/*" className="hidden-file-input" style={{ display: 'none' }} onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setIsUploadingActive(true);
                try { const url = await api.uploadProof(file); setProofInput(url); } catch { alert('Upload gagal'); }
                finally { setIsUploadingActive(false); }
              }} />
              <div style={{ textAlign: 'center' }}>
                {isUploadingActive ? <Loader2 size={32} className="animate-spin" /> : proofInput ? <CheckCircle size={32} className="text-green" /> : <Camera size={32} className="text-secondary" />}
                <p className="text-secondary" style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600 }}>{proofInput ? 'Ganti Foto' : 'Ambil Foto Bukti'}</p>
              </div>
            </label>

            {proofInput && (
              <div className="img-preview" style={{ marginTop: '1rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img src={proofInput} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
              </div>
            )}

            <button className="btn-primary" style={{ marginTop: '1.5rem', height: '56px', fontSize: '1rem' }} onClick={() => { 
                if (!proofInput) {
                  setDialog({
                    title: 'Status Cash?',
                    message: 'Belum ada bukti foto, kirim status sebagai Cash?',
                    onConfirm: () => { submitProof(currentUser); setDialog(null); },
                    confirmText: 'Ya, Cash'
                  });
                  return;
                }
                submitProof(currentUser); 
            }} disabled={isUploadingActive}>
              {isUploadingActive ? 'Mengirim...' : 'Konfirmasi Pembayaran'}
            </button>
          </div>
        )}

        {alreadyPaid && (
          <div className="success-banner" style={{ marginTop: '1rem', padding: '1.5rem', borderRadius: '20px' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '1rem' }}>🎉</span>
            <div>
              <strong style={{ display: 'block' }}>Pembayaran Berhasil!</strong>
              <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Tunggu {session.payer} membeli kopinya.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── GUEST PAGE ──────────────────────────────────────────────────────────────
  const renderGuestPage = () => (
    <div className="guest-view fade-in" style={{ padding: '2rem' }}>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
          <Coffee size={40} className="text-secondary" />
        </div>
        <h2 style={{ marginBottom: '1rem' }}>Kamu Sedang Menonton</h2>
        <p className="text-secondary" style={{ marginBottom: '2.5rem' }}>Kamu tidak ikut dalam sesi ini. Tunggu sesi berikutnya untuk memesan!</p>

        <div className="status-mini-card" style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '20px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.8rem', marginBottom: '8px' }} className="text-secondary">Payer Hari Ini:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {session.payer ? (
              <>
                <UserAvatar username={session.payer} size={32} />
                <strong style={{ fontSize: '1.1rem' }}>{session.payer}</strong>
              </>
            ) : (
              <span className="text-secondary">Mengetsa...</span>
            )}
          </div>
        </div>

        <button className="btn-secondary" style={{ marginTop: '2.5rem', width: '100%' }} onClick={() => setView('home')}>Kembali ke Home</button>
      </div>
    </div>
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
            history={store.history}
            payerHistory={store.payerHistory}
            currentUser={currentUser}
            onSelectSession={(s) => {
              setSelectedSession(s);
              setView('history-detail');
            }}
          />
        )}
        {view === 'history-detail' && (
          <HistoryDetailView
            session={selectedSession}
            currentUser={currentUser}
            api={api}
            onBack={() => setView('history')}
          />
        )}
        {view === 'order-detail' && (
          <OrderDetailView
            order={selectedOrder}
            currentUser={currentUser}
            api={api}
            onBack={() => setView('orders')}
          />
        )}
        {view === 'profile' && (
          <ProfileView
            username={currentUser}
            history={store.history}
            payerHistory={store.payerHistory}
            onSave={onUpdateProfile}
            onLogout={() => {
              localStorage.removeItem('ngopi_current_user');
              setCurrentUser('');
              setView('home');
            }}
          />
        )}
        {view === 'notifications' && (
          <NotificationView
            notifications={store.session?.notifications || []}
            username={currentUser}
            onAction={handleNotifAction}
          />
        )}
        {view === 'admin' && (
          !isAdminUnlocked ? (
            <AdminPinGate
              serverPin={store.adminPin}
              onSuccess={() => setIsAdminUnlocked(true)}
              onClose={() => setView('home')}
            />
          ) : (
            <AdminView
              menu={store.menu}
              users={store.users}
              history={store.history}
              activeSession={store.session}
              onSaveMenu={saveMenu}
              onResetPin={onResetPin}
              onForceClose={forceClose}
              onDeleteActiveSession={api.deleteActiveSession}
              onDeleteHistory={api.deleteHistory}
              onUpdateHistoricalOrder={api.updateHistoricalOrder}
              onDeleteAllNotifs={api.deleteAllNotifications}
              onSaveAdminPin={api.saveAdminPin}
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

    </div>
  );
}
