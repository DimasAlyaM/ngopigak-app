import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStore, api, initSupabaseSync, selectRoles } from './store.js';
import {
  Bell, Info, CreditCard, Coffee, Clock, CheckCircle, AlertTriangle, LogOut, ClipboardList,
  Lock, Unlock, LogIn, History, X, Trash2, PlusCircle, Shield, Users, User, ChevronDown, ChevronLeft,
  Camera, Upload, Loader2, Home
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
function NotifBell({ notifications, username, onMarkRead, isOpen, onToggle }) {
  const myNotifs = notifications.filter(n => n.to === username || n.to === 'all');
  const unread = myNotifs.filter(n => !n.read).length;
  return (
    <div className="notif-wrapper">
      <button className="notif-btn" onClick={() => { onToggle(); if (!isOpen) onMarkRead(); }}>
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {isOpen && (
        <>
          <div className="dialog-overlay bg-transparent" onClick={onToggle} style={{ display: window.innerWidth <= 768 ? 'block' : 'none', background: 'transparent' }} />
          <div className="notif-dropdown glass-panel">
            <div className="notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Notifikasi
              <button className="btn-icon" onClick={onToggle} style={{ padding: 0 }}><X size={18} /></button>
            </div>
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
        </>
      )}
    </div>
  );
}
function notifIcon(type) {
  const icons = { info: <Info size={16} />, payment: <CreditCard size={16} />, bought: <Coffee size={16} />, reminder: <Clock size={16} />, done: <CheckCircle size={16} />, debt: <AlertTriangle size={16} /> };
  return icons[type] || <Bell size={16} />;
}


// ─── STEPPER COMPONENT (for Penitip) ─────────────────────────────────────────
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
    if (pin.length < 4) { setError('PIN minimal 4 digit.'); triggerShake(); return; }
    if (isFirstTime) {
      if (pin !== confirmPin) { setError('PIN tidak cocok, coba lagi.'); triggerShake(); setPin(''); setConfirmPin(''); return; }
      api.saveAdminPin(pin);
      onSuccess();
    } else {
      if (pin !== serverPin) { setError('PIN salah!'); triggerShake(); setPin(''); return; }
      onSuccess();
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={`dialog-box glass-panel pin-gate ${shake ? 'shake' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="pin-icon">{isFirstTime ? <Lock size={48} /> : <Unlock size={48} />}</div>
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
            <button id="admin-pin-submit" type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isFirstTime ? <><CheckCircle size={18} /> Simpan PIN</> : <><Unlock size={18} /> Masuk</>}
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

// ─── ADMIN PANEL (MENU & USERS) ──────────────────────────────────────────────
function AdminPanel({ menu, users, history, activeSession, onSaveMenu, onResetPin, onForceClose, onDeleteActiveSession, onDeleteHistory, onUpdateHistoricalOrder, onDeleteAllNotifs, onSaveAdminPin, onClose }) {
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

  // History expansion
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(null); // format: "sessionId-username"

  return (
    <div className="dialog-overlay">
      <div className="dialog-box glass-panel admin-panel" style={{ maxWidth: (tab === 'users' || tab === 'history') ? '800px' : '640px' }}>
        <div className="admin-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={20} /> Panel Admin</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="tab-buttons mb-4" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0.5rem' }}>
          <button className={`tab-btn ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>☕ Menu</button>
          <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 User</button>
          <button className={`tab-btn ${tab === 'session' ? 'active' : ''}`} onClick={() => setTab('session')}>⚡ Sesi Aktif</button>
          <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📜 Riwayat</button>
          <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>⚙️ Pengaturan</button>
        </div>

        {tab === 'menu' && (
          <div className="fade-in">
            <div className="menu-list">
              {items.map(item => (
                <div key={item.id} className="menu-edit-row">
                  <input className="emoji-input" value={item.emoji} onChange={e => updateItem(item.id, 'emoji', e.target.value)} maxLength={2} />
                  <input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Nama menu" />
                  <input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} placeholder="Harga" style={{ width: '120px' }} />
                  <button className="btn-icon-danger" onClick={() => removeItem(item.id)}><Trash2 size={18} /></button>
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
              <button className="btn-primary" onClick={() => { onSaveMenu(items); onClose(); }}>Simpan Perubahan</button>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="user-management-list fade-in">
            <div className="table-header">
              <span>User</span>
              <span>Total Hutang</span>
              <span>Aksi</span>
            </div>
            <div className="scroll-container" style={{ maxHeight: '400px' }}>
              {users.map(u => {
                let debt = 0;
                history.forEach(session => {
                  if (session.debtors?.includes(u.username)) {
                    const order = session.orders.find(o => o.username === u.username);
                    debt += order?.item?.price || 0;
                  }
                });
                return (
                  <div key={u.username} className="user-mgt-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <UserAvatar username={u.username} size={24} />
                      <strong>{u.username}</strong>
                    </div>
                    <span className={debt > 0 ? 'text-red' : ''}>
                      {formatRp(debt)}
                    </span>
                    <button className="btn-secondary btn-small" onClick={() => {
                      if (confirm(`Reset PIN untuk ${u.username}? PIN baru akan menjadi '1234'.`)) {
                        onResetPin(u.username);
                      }
                    }}>Reset PIN</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'session' && (
          <div className="admin-session-management fade-in">
            {activeSession ? (
              <div className="panel bg-secondary" style={{ borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="badge-status-new hutang">Sesi Sedang Berjalan</span>
                  <span className="text-secondary text-sm">{formatDate(activeSession.startedAt)}</span>
                </div>
                <div className="stat-row"><span>Status:</span><strong>{activeSession.status.toUpperCase()}</strong></div>
                <div className="stat-row"><span>Pembuat:</span><strong>{activeSession.startedBy}</strong></div>
                <div className="stat-row"><span>Pesanan:</span><strong>{activeSession.orders.length} Item</strong></div>

                <div className="dialog-actions mt-6" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                  <button className="btn-danger" style={{ width: '100%' }} onClick={() => {
                    if (confirm("Tutup paksa sesi ini? Peserta yang belum bayar akan tercatat berhutang.")) {
                      onForceClose();
                    }
                  }}>Tutup Paksa & Simpan Histori</button>

                  <button className="btn-secondary" style={{ width: '100%', color: '#B91C1C', borderColor: '#B91C1C' }} onClick={() => {
                    if (confirm("HAPUS PERMANEN sesi ini? Data pesanan akan hilang total dan tidak masuk histori.")) {
                      onDeleteActiveSession(activeSession.id);
                    }
                  }}>Hapus Total (Tanpa Histori)</button>
                </div>
              </div>
            ) : (
              <div className="empty-state">Tidak ada sesi aktif saat ini.</div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="admin-history-management fade-in">
            <div className="table-header">
              <span>Tanggal / Sesi</span>
              <span>Total Sesi</span>
              <span>Aksi</span>
            </div>
            <div className="scroll-container" style={{ maxHeight: '400px' }}>
              {history.length === 0 && <p className="text-center py-4 opacity-50">Belum ada histori.</p>}
              {[...history].reverse().map(h => {
                const total = h.orders.reduce((sum, o) => sum + o.item.price, 0);
                const isExpanded = expandedHistoryId === h.id;

                return (
                  <div key={h.id} className="history-item-wrapper" style={{ borderBottom: '1px solid var(--text-primary)' }}>
                    <div className="user-mgt-row" style={{ gridTemplateColumns: '2fr 1fr 1fr', padding: '15px 10px', borderBottom: 'none' }}>
                      <div className="flex-col">
                        <span className="font-bold text-sm">{formatDate(h.startedAt)}</span>
                        <span className="text-xs opacity-70">Payer: {h.payer}</span>
                      </div>
                      <span className="text-sm font-bold">{formatRp(total)}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-icon-danger" style={{ padding: '6px' }} title="Hapus Histori" onClick={() => {
                          if (confirm("Hapus histori sesi ini secara PERMANEN?")) {
                            onDeleteHistory(h.id);
                          }
                        }}><Trash2 size={16} /></button>

                        <button
                          className={`btn-icon ${isExpanded ? 'active' : ''}`}
                          style={{
                            border: '1px solid var(--text-primary)',
                            padding: '6px',
                            background: isExpanded ? 'var(--text-primary)' : 'transparent',
                            color: isExpanded ? 'var(--bg-primary)' : 'var(--text-primary)'
                          }}
                          title="Detail & Edit Status"
                          onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                        >
                          <Users size={16} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="admin-history-details fade-in" style={{ padding: '0 10px 15px 10px', background: 'rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.6, borderBottom: '1px dashed var(--text-primary)', paddingBottom: '4px' }}>
                          Partisipan Sesi
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {h.orders.map((ord, idx) => {
                            const isPaid = !h.debtors?.some(d => (d || '').toLowerCase() === (ord.username || '').toLowerCase());
                            return (
                              <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-primary)',
                                padding: '12px',
                                border: '2px solid var(--text-primary)',
                                borderRadius: '8px',
                                boxShadow: '4px 4px 0 var(--text-primary)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <UserAvatar username={ord.username} size={28} />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase' }}>{ord.username}</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontFamily: 'var(--font-body)' }}>{ord.item.name} • {formatRp(ord.item.price)}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className={`badge-status-new ${isPaid ? 'lunas' : 'hutang'}`} style={{ fontSize: '0.65rem', padding: '2px 10px' }}>
                                    {isPaid ? 'LUNAS' : 'HUTANG'}
                                  </span>
                                  <button
                                    className="btn-mini"
                                    style={{
                                      backgroundColor: isPaid ? '#FEE2E2' : '#D1FAE5',
                                      color: isPaid ? '#DC2626' : '#059669',
                                      borderColor: isPaid ? '#DC2626' : '#059669',
                                      padding: '4px 10px',
                                      opacity: togglingStatus === `${h.id}-${ord.username}` ? 0.5 : 1,
                                      cursor: togglingStatus === `${h.id}-${ord.username}` ? 'not-allowed' : 'pointer'
                                    }}
                                    disabled={togglingStatus === `${h.id}-${ord.username}`}
                                    onClick={async () => {
                                      const key = `${h.id}-${ord.username}`;
                                      setTogglingStatus(key);
                                      try {
                                        await onUpdateHistoricalOrder(h.id, ord.username, { isPaid: !isPaid });
                                      } catch (err) {
                                        console.error("Historical update failed:", err);
                                        alert("Gagal merubah status. Silakan coba lagi.");
                                      } finally {
                                        setTogglingStatus(null);
                                      }
                                    }}
                                  >
                                    {togglingStatus === `${h.id}-${ord.username}` ? '...' : (isPaid ? 'Set Hutang' : 'Set Lunas')}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="admin-settings-tab fade-in">
            <div className="panel bg-secondary mb-6">
              <h4 className="section-title">Ganti PIN Admin</h4>
              <div className="modern-form">
                <div className="form-group">
                  <label>PIN Baru (4-8 digit)</label>
                  <input type="password" value={newAdminPin} onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="****" />
                </div>
                <div className="form-group">
                  <label>Konfirmasi PIN</label>
                  <input type="password" value={confirmAdminPin} onChange={e => setConfirmAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="****" />
                </div>
                <button className="btn-primary" onClick={() => {
                  if (newAdminPin.length < 4) { alert("PIN minimal 4 digit."); return; }
                  if (newAdminPin !== confirmAdminPin) { alert("PIN konfirmasi tidak cocok."); return; }
                  onSaveAdminPin(newAdminPin);
                  setNewAdminPin(''); setConfirmAdminPin('');
                  alert("PIN Admin berhasil diperbarui!");
                }}>Update PIN</button>
              </div>
            </div>

            <div className="panel" style={{ borderColor: '#B91C1C' }}>
              <h4 className="section-title" style={{ color: '#B91C1C', borderColor: '#B91C1C' }}>Pembersihan Data</h4>
              <p className="text-secondary text-sm mb-4">Hapus semua notifikasi lama untuk menjaga kecepatan aplikasi.</p>
              <button className="btn-danger" style={{ width: '100%' }} onClick={() => {
                if (confirm("HAPUS SEMUA notifikasi? Tindakan ini tidak bisa dibatalkan.")) {
                  onDeleteAllNotifs();
                  alert("Semua notifikasi telah dibersihkan.");
                }
              }}>Bersihkan Semua Notifikasi</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── USER PROFILE EDIT MODAL ──────────────────────────────────────────────────
// ─── USER PROFILE VIEW ────────────────────────────────────────────────────────
function ProfileView({ username, history, onSave, onLogout }) {
  const [name, setName] = useState(username);

  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));
  const mySessions = validHistory.filter(s => s.orders.some(o => (o.username || '').toLowerCase() === (username || '').toLowerCase()));
  const myDebts = mySessions.filter(s => s.debtors?.some(d => (d || '').toLowerCase() === (username || '').toLowerCase()));

  const totalOwed = myDebts.reduce((acc, s) => {
    const myOrder = s.orders.find(o => (o.username || '').toLowerCase() === (username || '').toLowerCase());
    return acc + (myOrder?.item?.price || 0);
  }, 0);

  return (
    <div className="profile-view fade-in">
      <div className="profile-container glass-panel-premium" style={{ padding: '2rem' }}>
        <div className="view-header">
          <h2 className="text-gradient">Profil Saya</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div className="avatar-wrapper">
             <UserAvatar username={username} size={96} />
          </div>
          <p className="text-secondary text-sm mt-4 text-center">Avatar dihasilkan otomatis dari namamu.</p>
        </div>

        <div className="debt-card-modern mb-8 fade-in">
          <span className="text-secondary text-xs uppercase font-bold tracking-wider">Total Hutang Saya</span>
          <div className="flex-between align-end">
            <h1 className={totalOwed > 0 ? 'text-red' : 'text-green'} style={{ fontSize: '2.5rem', margin: 0 }}>
              {formatRp(totalOwed)}
            </h1>
            {totalOwed > 0 && <span className="text-red text-xs mb-2">Belum Lunas</span>}
          </div>
        </div>

        <div className="modern-form">
          <div className="form-group mb-8">
            <label>NAMA TAMPILAN</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ketik nama baru..."
              className="premium-input"
            />
          </div>
          
          <div className="flex-col gap-3">
            <button className="btn-primary-pill" onClick={() => onSave(username, name)}>
              Simpan Perubahan
            </button>
            
            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '1.5rem 0' }} />
            
            <button className="btn-logout" onClick={onLogout}>
              <LogOut size={18} style={{ marginRight: '8px' }} />
              Log Out dari Akun
            </button>
          </div>
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
    <div className="history-view fade-in">
      <div className="history-container glass-panel-full">
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
              const isDbt = s.debtors?.some(d => (d || '').toLowerCase() === (currentUser || '').toLowerCase());
              const totalAmount = s.orders.reduce((sum, o) => sum + (o.item?.price || 0), 0);

              return (
                <div key={s.id} className="history-card-wrapper" style={{ marginBottom: '12px' }}>
                  <div 
                    className="item-card glass-panel" 
                    style={{ padding: '16px', borderRadius: '24px', cursor: 'pointer', borderLeft: isDbt ? '4px solid #ef4444' : '1px solid var(--glass-border)' }}
                    onClick={() => onSelectSession(s)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '16px' }}>
                        <Coffee size={24} className="text-accent" />
                      </div>
                      <div>
                        <p style={{ fontSize: '1rem', fontWeight: 700 }}>{formatDate(s.startedAt).split(',')[0]}</p>
                        <p className="text-secondary" style={{ fontSize: '0.8rem' }}>
                          {s.orders.length} Peserta &bull; {s.payer}{s.companion ? ` & ${s.companion}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatRp(totalAmount)}</p>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isDbt ? '#ef4444' : '#4ade80' }}>
                        {isDbt ? 'HUTANG' : 'LUNAS'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY DETAIL VIEW ──────────────────────────────────────────────────────
function HistoryDetailView({ session, onBack, currentUser, api }) {
  const [uploadingId, setUploadingId] = useState(null);
  if (!session) return null;

  const isDbt = session.debtors?.some(d => (d || '').toLowerCase() === (currentUser || '').toLowerCase());
  const mOrder = session.orders.find(o => (o.username || '').toLowerCase() === (currentUser || '').toLowerCase());
  const totalSession = session.orders.reduce((sum, o) => sum + o.item.price, 0);

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
            <div key={idx} className="item-card glass-panel" style={{ padding: '12px 16px', borderRadius: '24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <UserAvatar username={o.username} size={36} />
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item.name}</p>
                  </div>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatRp(o.item.price)}</p>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: orderDebt ? '#ef4444' : '#4ade80' }}>
                    {orderDebt ? 'HUTANG' : 'LUNAS'}
                  </span>

                  {(currentUser || '').toLowerCase() === (session.payer || '').toLowerCase() && orderDebt && (
                    <button
                      className="btn-mini btn-green shadow-sm mt-1"
                      style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Konfirmasi pembayaran dari ${o.username}?`)) {
                          api.updateHistoricalOrder(session.id, o.username, { isPaid: true, markedByPayer: true });
                        }
                      }}
                    >
                      Konfirmasi
                    </button>
                  )}
               </div>
            </div>
          );
        })}
      </div>

      {isDbt && mOrder && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>⚠️ Kamu berhutang **{formatRp(mOrder.item.price)}** kepada **{session.payer}**.</p>
          
          {!mOrder.paymentProof && (
            <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', opacity: uploadingId === session.id ? 0.7 : 1 }}>
              <input
                type="file"
                accept="image/*"
                className="hidden-file-input"
                style={{ display: 'none' }}
                disabled={!!uploadingId}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadingId(session.id);
                  try {
                    const url = await api.uploadProof(file);
                    await api.updateHistoricalOrder(session.id, currentUser, { paymentProof: url });
                  } catch (err) {
                    console.error("Upload failed:", err);
                  } finally {
                    setUploadingId(null);
                  }
                }}
              />
              {uploadingId === session.id ? <Loader2 className="animate-spin" size={20} /> : <><Camera size={20} /> <span>Upload Bukti</span></>}
            </label>
          )}

          {mOrder.paymentProof && (
            <div className="proof-area" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <span className="text-green" style={{ fontSize: '0.75rem', fontWeight: 800 }}>BUKTI TERUNGGAH</span>
                 <button className="btn-mini btn-green" onClick={() => api.updateHistoricalOrder(session.id, currentUser, { isPaid: true })}>KONFIRMASI BAYAR</button>
              </div>
              <a href={mOrder.paymentProof} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '16px', overflow: 'hidden' }}>
                <img src={mOrder.paymentProof} alt="Bukti" style={{ width: '100%', display: 'block' }} />
              </a>
            </div>
          )}
        </div>
      )}
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
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);

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
    if (view === 'session' && store.session?.status === 'completed') {
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
          companion: s.session.companion, // Explicitly ensure companion is here
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
    if (!s.session) return;
    const debtors = s.session.orders.filter(o => !o.isPaid && o.username !== s.session.payer).map(o => o.username);

    await api.updateSession(s.session.id, { status: 'force-closed', forceClosedBy: currentUser, debtors });
    const full = { ...loadStore().session, status: 'force-closed', forceClosedBy: currentUser, debtors, companion: loadStore().session.companion };
    await api.saveHistory(s.session.id, full);
    await api.deleteActiveSession(s.session.id);

    if (debtors.length > 0) {
      debtors.forEach(d => api.notify(s.session.id, d, 'debt', `Sesi ditutup paksa. Hutangmu dicatat.`));
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

  const totalAmount = session?.orders?.reduce((sum, o) => sum + o.item.price, 0) || 0;
  const paidAmount = session?.orders?.filter(o => o.isPaid).reduce((sum, o) => sum + o.item.price, 0) || 0;
  const unpaidCount = session?.orders?.filter(o => !o.isPaid && o.username !== session.payer).length || 0;
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
              Dimsam &bull; 2026
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── BOTTOM NAVIGATION COMPONENT ───────────────────────────────────────────
  const BottomNav = () => (
    <nav className="bottom-nav">
      <div className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
        <div className="nav-icon"><Home size={20} /></div>
        <span>Home</span>
      </div>
      <div className={`nav-item ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
        <div className="nav-icon"><Clock size={20} /></div>
        <span>Pesanan</span>
      </div>
      <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => goToHistory()}>
        <div className="nav-icon"><History size={20} /></div>
        <span>History</span>
      </div>
      <div className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
        <div className="nav-icon"><User size={20} /></div>
        <span>Profile</span>
      </div>
    </nav>
  );

  // ─── VIEW: HOME ─────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="home-view fade-in" style={{ padding: '1rem' }}>
      <div className="welcome-section" style={{ marginBottom: '2rem' }}>
        <p className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Selamat Pagi,</p>
        <h2 style={{ fontSize: '1.8rem' }}>{currentUser}! 👋</h2>
      </div>
      
      {/* Dynamic Banner Section */}
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
           onClick={() => setView('live-session')}
        >
          {session && !sessionDone ? 'Lanjut Ngopi' : 'Mulai Baru'}
        </button>
      </div>

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
          <h2 className="text-gradient">Pesanan Kamu</h2>
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
              <div key={idx} className="item-card glass-panel" style={{ padding: '16px', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '16px', fontSize: '1.2rem' }}>
                    {o.item.emoji || '☕'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{o.item.name}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      {formatDate(o.sessionDate).split(',')[0]} &bull; {o.isLive ? 'Sesi Aktif' : `Dibayar oleh ${o.payer}`}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>{formatRp(o.item.price)}</p>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    fontWeight: 800, 
                    padding: '4px 8px', 
                    borderRadius: '8px',
                    background: o.isPaid ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: o.isPaid ? '#4ade80' : '#ef4444'
                  }}>
                    {o.isPaid ? 'LUNAS' : 'HUTANG'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ─── VIEW: SESSION ──────────────────────────────────────────────────────────
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
      const totalSession = session.orders.reduce((sum, o) => sum + o.item.price, 0);
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
                <strong style={{ fontSize: '1.1rem' }}>{session.orders.length} orang</strong>
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
            <div className={`timer-chip ${timeLeft < 60 ? 'urgent' : ''}`} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '12px', fontWeight: 800 }}>
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
                      {store.menu.filter(m => m.name.toLowerCase().includes(coffeeSearch.toLowerCase())).map(m => (
                        <div key={m.id} className="dropdown-item" onClick={() => { setSelectedCoffeeId(m.id); setCoffeeSearch(`${m.emoji} ${m.name}`); setShowMenuResults(false); }} style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{m.emoji} {m.name}</span>
                          <span className="text-accent">{formatRp(m.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button className="btn-primary" type="submit" style={{ borderRadius: '20px' }}>
                {myOrder ? 'Update Pesanan' : 'Tambah Pesanan'}
              </button>
            </form>
          </div>

          <div className="order-list-section">
            <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Daftar Pesanan ({session.orders.length})</h4>
            <div className="card-stack">
              {session.orders.map(o => (
                <div key={o.id} className={`item-card glass-panel ${o.username === currentUser ? 'active-border' : ''}`} style={{ padding: '12px 16px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserAvatar username={o.username} size={36} />
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                      <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item.emoji} {o.item.name}</p>
                    </div>
                  </div>
                  <strong className="text-accent">{formatRp(o.item.price)}</strong>
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
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Sudah bayar {store.payerHistory[session.payer] || 0} kali</p>
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
                <p className="text-secondary">Menunggu <strong>{session.payer}</strong> mengisi info pembayaran...</p>
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
  };

  // ─── PAYER PAGE ─────────────────────────────────────────────────────────────
  const renderPayerPage = () => {
    const nonPayer = session.orders.filter(o => o.username !== session.payer);
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
            {session.orders.map(o => (
              <div key={o.id} className="item-card glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <UserAvatar username={o.username} size={40} />
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      {o.username} {o.username === session.payer && <span className="text-accent" style={{ fontSize: '0.7rem' }}>(Kamu)</span>}
                    </p>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item.emoji} {o.item.name}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800, marginBottom: '6px' }}>{formatRp(o.item.price)}</p>
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
            <div style={{ fontSize: '3rem', background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{myOrder?.item.emoji || '☕'}</div>
            <div>
              <h3 style={{ fontSize: '1.3rem' }}>{myOrder?.item.name}</h3>
              <p className="text-accent" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatRp(myOrder?.item.price)}</p>
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
                 const file = e.target.files[0]; if(!file) return;
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

            <button className="btn-primary" style={{ marginTop: '1.5rem', height: '56px', fontSize: '1rem' }} onClick={() => { if(!proofInput && !confirm('Belum ada bukti, kirim status Cash?')) return; submitProof(currentUser); }} disabled={isUploadingActive}>
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
            <UserAvatar username={session.payer} size={32} />
            <strong style={{ fontSize: '1.1rem' }}>{session.payer}</strong>
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
          <button className="btn-icon" onClick={() => setShowAdminPin(true)} style={{ marginRight: '0.5rem' }}>
            <Shield size={18} />
          </button>
          <NotifBell
            notifications={session?.notifications || []}
            username={currentUser}
            onMarkRead={markNotifsRead}
            isOpen={activeMenu === 'notif'}
            onToggle={() => setActiveMenu(prev => prev === 'notif' ? null : 'notif')}
          />
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
        {view === 'profile' && (
          <ProfileView
            username={currentUser}
            history={store.history}
            onSave={onUpdateProfile}
            onLogout={() => {
              localStorage.removeItem('ngopi_current_user');
              setCurrentUser('');
              setView('home');
            }}
          />
        )}
      </main>

      {/* FAB: Start Session (Visible on Home when no session active) */}
      {view === 'home' && (!session || sessionDone) && (
        <button className="fab" onClick={startSession}>
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
      
      {showAdminPin && (
        <AdminPinGate
          serverPin={store.adminPin}
          onSuccess={() => { setShowAdminPin(false); setShowAdminPanel(true); }}
          onClose={() => setShowAdminPin(false)}
        />
      )}
      
      {showAdminPanel && (
        <AdminPanel
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
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
}
