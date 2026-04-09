import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStore, api, initSupabaseSync, selectRoles } from './store.js';
import {
  Bell, Info, CreditCard, Coffee, Clock, CheckCircle, AlertTriangle, LogOut, ClipboardList,
  Lock, Unlock, LogIn, History, X, Trash2, PlusCircle, Shield, Users, User, ChevronDown,
  Camera, Upload, Loader2
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

// ─── USER PROFILE COMPONENT ──────────────────────────────────────────────────
function UserProfile({ username, onLogout, onShowHistory, onShowProfile, isOpen, onToggle }) {
  return (
    <div className="notif-wrapper">
      <div className="user-chip" onClick={onToggle} title="Profil">
        <UserAvatar username={username} size={28} />
        <span>{username}</span>
      </div>
      {isOpen && (
        <>
          <div className="dialog-overlay bg-transparent" onClick={onToggle} style={{ display: window.innerWidth <= 768 ? 'block' : 'none', background: 'transparent' }} />
          <div className="notif-dropdown profile-dropdown">
            <div className="notif-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Menu Profil
              <button className="btn-icon" onClick={onToggle} style={{ padding: 0 }}><X size={18} /></button>
            </div>
            <div className="notif-item" onClick={() => { onToggle(); onShowHistory(); }} style={{ cursor: 'pointer' }}>
              <span className="notif-type"><ClipboardList size={18} /></span>
              <div className="notif-msg" style={{ marginTop: '2px' }}>Histori Order</div>
            </div>
            <div className="notif-item" onClick={() => { onToggle(); onLogout(); }} style={{ cursor: 'pointer', color: '#B91C1C' }}>
              <span className="notif-type"><LogOut size={18} /></span>
              <div className="notif-msg" style={{ marginTop: '2px' }}>Keluar (Logout)</div>
            </div>
          </div>
        </>
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
function ProfileModal({ username, onSave, onClose }) {
  const [name, setName] = useState(username);
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box glass-panel" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <h3 className="mb-4">Edit Profil</h3>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <UserAvatar username={username} size={80} />
        </div>
        <p className="text-secondary text-sm mb-4 text-center">Avatar kamu otomatis dihasilkan dari nama.</p>
        <div className="form-group mb-6">
          <label>Nama Tampilan</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan nama baru" />
        </div>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={() => onSave(username, name)}>Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ history, payerHistory, currentUser, filter, setFilter, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  const validHistory = (history || []).filter(s => s && Array.isArray(s.orders));
  const mySessions = validHistory.filter(s => s.orders.some(o => o.username === currentUser));
  const myDebts = mySessions.filter(s => s.debtors?.includes(currentUser));

  const totalOwed = myDebts.reduce((acc, s) => {
    const myOrder = s.orders.find(o => o.username === currentUser);
    return acc + (myOrder?.item?.price || 0);
  }, 0);

  const displayedHistory = filter === 'my-debt' ? myDebts : validHistory;

  return (
    <div className="history-view fade-in">
      <div className="history-container glass-panel">
        <div className="admin-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={24} /> Histori Sesi</h3>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Debt Dashboard - Only show in My Debt tab or make it very compact */}
        {filter === 'my-debt' && (
          <div className="debt-dashboard-card mb-4 fade-in">
            <div className="debt-stat">
              <span className="text-secondary text-sm">Total Hutang Saya</span>
              <h2 className={totalOwed > 0 ? 'text-red' : 'text-green'}>{formatRp(totalOwed)}</h2>
            </div>
            {totalOwed > 0 && <p className="text-xs mt-2 opacity-70">Bayar ke pembayar masing-masing sesi ya!</p>}
          </div>
        )}

        <div className="tab-buttons mb-4">
          <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua Sesi</button>
          <button className={`tab-btn ${filter === 'my-debt' ? 'active' : ''}`} onClick={() => setFilter('my-debt')}>Hutang Saya</button>
        </div>

        <div className="history-list" style={{ paddingBottom: '2rem' }}>
          {displayedHistory.length === 0 ? (
            <div className="empty-state">Belum ada histori {filter === 'my-debt' ? 'hutang' : 'sesi'}.</div>
          ) : (
            [...displayedHistory].reverse().map(s => {
              const isExpanded = expandedId === s.id;
              const isDbt = s.debtors?.some(d => (d || '').toLowerCase() === (currentUser || '').toLowerCase());
              const mOrder = s.orders.find(o => (o.username || '').toLowerCase() === (currentUser || '').toLowerCase());

              return (
                <div key={s.id} className={`history-card-new ${isDbt ? 'has-debt' : ''}`} onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                  <div className="history-card-header">
                    <div className="flex-col">
                      <span className="history-date">{formatDate(s.startedAt)}</span>
                      <span className="text-xs opacity-70">Pembayar: <strong>{s.payer}</strong></span>
                    </div>
                    <div className="badge-status-group">
                      <span className={`badge-status-new ${isDbt ? 'hutang' : 'lunas'}`}>
                        {isDbt ? 'HUTANG SAYA' : 'LUNAS'}
                      </span>
                      {mOrder && isDbt && (
                        <span className="text-xs font-bold text-red">
                          Belum Bayar {formatRp(mOrder.item.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="history-card-details fade-in" onClick={e => e.stopPropagation()}>
                      <div className="detail-section">
                        <h4> DETAIL SESI</h4>
                        <div className="detail-info-list mt-2">
                          <p className="text-sm">Pembayar Utama: <strong className="text-green">{s.payer}</strong></p>
                          <p className="text-sm">Pendamping: <strong>{s.companion || '-'}</strong></p>
                          <p className="text-sm">Total Sesi: <strong>{formatRp(s.orders.reduce((sum, o) => sum + o.item.price, 0))}</strong></p>
                        </div>
                      </div>

                      <div className="detail-section mt-6">
                        <h4> PENITIP & PESANAN</h4>
                        <div className="order-details-vertical mt-2">
                          {s.orders.map((o, idx) => (
                            <div key={idx} className="order-detail-row-flat">
                              <div className="row-main">
                                <UserAvatar username={o.username} size={24} />
                                <div className="user-info">
                                  <span className="username">{o.username}</span>
                                  <span className="item-name opacity-70">{o.item.name}</span>
                                </div>
                              </div>
                              <div className="row-meta">
                                <span className="price">{formatRp(o.item.price)}</span>
                                {s.debtors?.some(d => (d || '').toLowerCase() === (o.username || '').toLowerCase())
                                  ? <span className="badge-debt-small">HUTANG</span>
                                  : <span className="badge-paid-small">LUNAS</span>
                                }

                                {/* Payer Action: Confirm Payment for others or self if it was my session */}
                                {(currentUser || '').toLowerCase() === (s.payer || '').toLowerCase() &&
                                  s.debtors?.some(d => (d || '').toLowerCase() === (o.username || '').toLowerCase()) && (
                                    <button
                                      className="btn-mini btn-green ms-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Konfirmasi pembayaran dari ${o.username}?`)) {
                                          api.updateHistoricalOrder(s.id, o.username, { isPaid: true, markedByPayer: true });
                                        }
                                      }}
                                    >
                                      Konfirmasi
                                    </button>
                                  )}
                              </div>
                              {o.paymentProof && (
                                <div className="proof-link-mini">
                                  <a href={o.paymentProof} target="_blank" rel="noreferrer" className="text-xs text-blue underline">
                                    Lihat Bukti
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {isDbt && mOrder && (
                        <div className="debt-instruction-box mt-6">
                          <p>⚠️ Kamu berhutang **{formatRp(mOrder.item.price)}** kepada **{s.payer}**.</p>

                          {!mOrder.paymentProof && (
                            <div className="historical-proof-submit mt-3">
                              <label className="upload-box-new">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden-file-input"
                                  disabled={!!uploadingId}
                                  onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setUploadingId(s.id);
                                    try {
                                      const url = await api.uploadProof(file);
                                      await api.updateHistoricalOrder(s.id, currentUser, { paymentProof: url });
                                      // No alert, just reactive update
                                    } catch (err) {
                                      console.error("Upload failed:", err);
                                    } finally {
                                      setUploadingId(null);
                                    }
                                  }}
                                />
                                <div className="upload-content">
                                  {uploadingId === s.id ? (
                                    <Loader2 className="animate-spin" size={20} />
                                  ) : (
                                    <><Camera size={20} /> <span>Upload Foto Bukti</span></>
                                  )}
                                </div>
                              </label>
                            </div>
                          )}
                          {mOrder.paymentProof && (
                            <div className="proof-area-enhanced mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1 text-green text-xs font-bold">
                                  <CheckCircle size={14} /> Bukti terunggah
                                </div>
                                {isDbt && (
                                  <button
                                    className="btn-mini btn-green shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      api.updateHistoricalOrder(s.id, currentUser, { isPaid: true });
                                    }}
                                  >
                                    KONFIRMASI SAYA SUDAH BAYAR
                                  </button>
                                )}
                              </div>
                              <a href={mOrder.paymentProof} target="_blank" rel="noreferrer" className="img-preview-major">
                                <img src={mOrder.paymentProof} alt="Bukti Transfer" />
                                <div className="preview-overlay">Klik untuk zoom</div>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isExpanded && (
                    <div className="expand-hint">
                      <span>Lihat Detail</span>
                      <ChevronDown size={14} />
                    </div>
                  )}
                </div>
              );
            })
          )}
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
  const [pinInput, setPinInput] = useState('');
  const [view, setView] = useState('home'); // home | session | history | admin
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
  const [showProfileModal, setShowProfileModal] = useState(false);

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
      api.notify(s.session.id, s.session.payer, 'payment', ` ${username} sudah konfirmasi pembayaran.`);
      checkSessionComplete(s, order.id);
    }
  };

  const markPaidByPayer = async (username) => {
    const s = loadStore();
    if (!s.session) return;
    const order = s.session.orders.find(o => o.username === username);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, true);
      api.notify(s.session.id, username, 'payment', ` ${s.session.payer} menandai pembayaranmu sebagai lunas (cash).`);
      checkSessionComplete(s, order.id);
    }
  };

  async function checkSessionComplete(s, newlyPaidOrderId) {
    const others = s.session.orders.filter(o => o.username !== s.session.payer);
    // Simulate current state + the one we just updated
    const allOthersPaid = others.every(o => o.isPaid || o.id === newlyPaidOrderId);
    if (allOthersPaid) {
      alert('Selamat Ngopi Ndan!');
      setView('home');

      try {
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
        // After moving to history, remove from active sessions table
        await api.deleteActiveSession(s.session.id);
        s.session.orders.forEach(o => {
          api.notify(s.session.id, o.username, 'done', ' Sesi selesai! Semua sudah bayar. Makasih! ');
        });
      } catch (e) {
        console.error("Error sealing session history", e);
      }
    }
  }

  const forceClose = async () => {
    const s = loadStore();
    if (!s.session) return;
    const debtors = s.session.orders.filter(o => !o.isPaid && o.username !== s.session.payer).map(o => o.username);

    await api.updateSession(s.session.id, { status: 'force-closed', forceClosedBy: currentUser, debtors });
    const full = { ...loadStore().session, status: 'force-closed', forceClosedBy: currentUser, debtors };
    await api.saveHistory(s.session.id, full);
    // After moving to history, remove from active sessions table
    await api.deleteActiveSession(s.session.id);

    if (debtors.length > 0) {
      debtors.forEach(d => api.notify(s.session.id, d, 'debt', ` Sesi ditutup paksa. Kamu tercatat belum bayar Rp ${s.session.orders.find(o => o.username === d)?.item.price.toLocaleString()}`));
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
      setShowProfileModal(false); // Close the profile modal itself
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
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-logo text-gradient">NgopiGak?</div>
        </nav>
        <div className="login-screen fade-in">
          <div className="login-card glass-panel">
            <div className="login-icon"><User size={48} /></div>
            <h2 className="login-title">Siapa Kamu?</h2>
            <p className="text-secondary" style={{ marginBottom: '2rem' }}>Masukkan nama dan 4 digit PIN untuk mulai ngopi bareng</p>
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
              <div className="form-group" style={{ marginTop: '1rem' }}>
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
              <button id="login-submit" type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                Masuk <LogIn size={18} />
              </button>
            </form>
            <div className="login-footer" style={{ marginTop: '2.5rem', opacity: 0.5, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '1px' }}>
              Dimsam - 2026
            </div>
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
            <button id="start-session-btn" className="btn-primary" onClick={startSession} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlusCircle size={18} /> Buka Sesi Ngopi</button>
          ) : (
            <button id="join-session-btn" className="btn-primary" onClick={() => setView('session')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {session.status === 'open' ? <><PlusCircle size={18} /> Join Sesi Aktif</> : <><Info size={18} /> Lihat Sesi Berjalan</>}
            </button>
          )}
          <button className="btn-secondary" onClick={() => goToHistory('all')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={18} /> Histori</button>
        </div>
        {session && !sessionDone && session.status === 'open' && (
          <div className="session-live-badge">
            <span className="live-dot" /><span>Sesi Aktif</span>
            <span className="live-timer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {formatTime(timeLeft)} tersisa</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14} /> {session.orders.length} orang pesan</span>
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
        <button className="btn-primary mt-4" onClick={startSession} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlusCircle size={18} /> Buka Sesi</button>
      </div>
    );

    // SESSION SELESAI — tampilkan layar ringkasan, bukan blank/stuck
    if (session.status === 'completed' || session.status === 'force-closed') {
      const isForced = session.status === 'force-closed';
      const debtors = session.debtors || [];
      const totalSession = session.orders.reduce((sum, o) => sum + o.item.price, 0);
      return (
        <div className="empty-state fade-in" style={{ padding: '2rem 1rem' }}>
          <div className="glass-panel summary-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem', textAlign: 'center' }}>
            <div className={`summary-icon ${isForced ? 'error' : 'success'}`}>
              {isForced ? <AlertTriangle size={64} /> : <CheckCircle size={64} />}
            </div>
            <h2 className="summary-title">{isForced ? 'Sesi Selesai (Hutang Tercatat)' : 'Sesi Selesai (Lunas Total)'}</h2>
            <p className="text-secondary mb-6">
              {isForced
                ? `Sesi ditutup paksa oleh ${session.forceClosedBy || 'Sistem'}.`
                : 'Mantap! Semua kopi sudah dibayar lunas.'}
            </p>

            <div className="summary-stats stats-box mb-6">
              <div className="stat-row"><span>Total Putaran:</span><strong>{formatRp(totalSession)}</strong></div>
              <div className="stat-row"><span>Peserta:</span><strong>{session.orders.length} orang</strong></div>
              <div className="stat-row"><span>Status:</span><strong className={isForced ? 'text-red' : 'text-green'}>{isForced ? 'Berhutang' : 'Lunas'}</strong></div>
            </div>

            {debtors.length > 0 && (
              <div className="debtor-list-summary mb-6">
                <h4>Belum Bayar:</h4>
                <div className="debtor-chips">
                  {debtors.map(d => <span key={d} className="debtor-chip">{d}</span>)}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => setView('home')}>
                <PlusCircle size={18} /> Buka Sesi Baru
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => goToHistory('all')}>
                Lihat Histori Lengkap
              </button>
            </div>
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
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Coffee size={24} /> Sesi Terbuka</h2>
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
              : <div className="no-order-hint glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Kamu belum pesan! Order sekarang agar masuk undian jadi pembayar.</div>
            }
            <form onSubmit={addOrder} className="modern-form" style={{ marginTop: '1.5rem' }}>
              <div className="form-group relative">
                <label>Pilih Menu Kopi</label>
                <div className="searchable-dropdown" ref={coffeeDropdownRef}>
                  <input
                    type="text"
                    id="coffee-search-input"
                    placeholder="Ketik nama kopi (misal: Latte)..."
                    value={coffeeSearch}
                    onFocus={() => setShowMenuResults(true)}
                    onChange={(e) => setCoffeeSearch(e.target.value)}
                    autoComplete="off"
                    required={!selectedCoffeeId}
                  />
                  {showMenuResults && (
                    <div className="search-results-list glass-panel">
                      {store.menu
                        .filter(m => m.name.toLowerCase().includes(coffeeSearch.toLowerCase()))
                        .map(m => (
                          <div
                            key={m.id}
                            className={`search-item ${selectedCoffeeId === m.id ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedCoffeeId(m.id);
                              setCoffeeSearch(`${m.emoji} ${m.name}`);
                              setShowMenuResults(false);
                            }}
                          >
                            <span className="item-main">{m.emoji} {m.name}</span>
                            <span className="item-price">{formatRp(m.price)}</span>
                          </div>
                        ))}
                      {store.menu.filter(m => m.name.toLowerCase().includes(coffeeSearch.toLowerCase())).length === 0 && (
                        <div className="search-empty">Menu tidak ditemukan...</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button id="order-submit" type="submit" className="btn-primary">{myOrder ? ' Update Pesanan' : '+ Tambah Pesanan'}</button>
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
                {session.orders.length === 0 ? 'Batalkan Sesi (Kosong) ' : 'Tutup Sesi & Pilih Relawan '}
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
              <h2> Relawan Terpilih!</h2>
            </div>
            <div className="volunteer-highlights mb-4">
              <div className="highlight-card bg-accent-glow">
                <span className="badge"> PEMBAYAR</span>
                <h3>{session.payer}</h3>
                <span className="text-secondary text-sm">{(store.payerHistory[session.payer] || 0)} kali sebelumnya</span>
              </div>
              {session.companion && (
                <div className="highlight-card">
                  <span className="badge"> PENDAMPING</span>
                  <h3>{session.companion}</h3>
                </div>
              )}
            </div>

            {isPayer ? (
              <div style={{ padding: '0 1rem' }}>
                <h3 className="mb-4" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                  Lengkapi Info Pembayaran
                </h3>
                <p className="text-secondary mb-4 text-sm">
                  Kamu terpilih sebagai Pembayar! Isi rekening/nomor tujuan transfer agar semua bisa bayar ke kamu.
                </p>
                <form onSubmit={submitPaymentInfo} className="modern-form form-grid">
                  <div className="form-group mb-4">
                    <label>Metode Pembayaran</label>
                    <select id="payment-method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                      <option value="" disabled>-- Pilih Metode --</option>
                      <option value="BANK"> Bank Transfer</option>
                      <option value="GOPAY"> GoPay</option>
                      <option value="DANA"> DANA</option>
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
                    Konfirmasi & Kirim Notifikasi
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
          <span className="role-badge"> Kamu Pembayar</span>
          <h2>Dashboard Pembayar</h2>
          <p className="text-secondary">Rekap semua pesanan dan status pembayaran dari setiap peserta.</p>
        </div>

        <div className="dashboard-grid">
          {/* Order Summary */}
          <div className="panel glass-panel">
            <h3 className="section-title"> Rekap Pesanan</h3>
            <div className="stats-box mb-4">
              <div className="stat-row"><span>Total Keseluruhan:</span><strong>{formatRp(totalAmount)}</strong></div>
              <div className="stat-row"><span>Terkumpul:</span><strong className="text-green">{formatRp(paidAmount)}</strong></div>
              <div className="stat-row"><span>Sisa Belum Bayar:</span><strong className="text-red">{formatRp(totalAmount - paidAmount)}</strong></div>
              <div className="stat-row"><span>Progress:</span><strong>{paidCount}/{nonPayer.length} orang lunas</strong></div>
            </div>

            <button className="btn-secondary btn-small" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={remindAll}>
              📢 Tagih Semua yang Belum Lunas
            </button>

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
                        <span className="badge-paid"> LUNAS</span>
                        {o.paymentProof && (
                          <div style={{ marginTop: '4px' }}>
                            <a href={o.paymentProof} target="_blank" rel="noreferrer" className="proof-link">Lihat Bukti</a>
                          </div>
                        )}
                        {o.markedByPayer && <p className="text-secondary text-sm" style={{ marginTop: '3px' }}>Cash</p>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                        {o.paymentProof && <span className="badge-verification">Menunggu Verifikasi</span>}
                        <button id={`mark-paid-${o.username}`} className="btn-primary btn-small" onClick={() => markPaidByPayer(o.username)}>
                          {o.paymentProof ? 'Konfirmasi Lunas' : 'Tandai Lunas'}
                        </button>
                        {o.paymentProof && <a href={o.paymentProof} target="_blank" rel="noreferrer" className="proof-link">Lihat Bukti</a>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Payment Info */}
            {session.paymentInfo && (
              <div>
                <h3 className="section-title"> Info Transfer Kamu</h3>
                <div className="payment-info-card glass-panel">
                  <div className="payment-method-tag">{session.paymentInfo.method}</div>
                  {session.paymentInfo.bankName && <p><span className="text-secondary">Bank:</span> <strong>{session.paymentInfo.bankName}</strong></p>}
                  <p><span className="text-secondary">Nomor:</span> <strong style={{ fontSize: '1.2rem' }}>{session.paymentInfo.accountNo}</strong></p>
                  <p><span className="text-secondary">A.n.:</span> <strong>{session.payer}</strong></p>
                </div>
              </div>
            )}

            {/* Coffee Bought */}
            {!session.coffeeBought ? (
              <div>
                <h3 className="section-title"> Status Pembelian</h3>
                <p className="text-secondary text-sm mb-4">Tekan tombol ini setelah kopi sudah dibeli dan dalam perjalanan.</p>
                <button
                  id="coffee-bought-btn"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setDialog({
                    title: 'Konfirmasi Pembelian',
                    message: 'Apakah kamu sudah membeli semua kopi? Semua peserta akan mendapat notifikasi.',
                    onConfirm: confirmBought,
                    confirmText: ' Ya, Kopi Sudah Dibeli!'
                  })}
                >
                  Kopi Sudah Dibeli
                </button>
              </div>
            ) : (
              <div className="success-banner">
                <span></span>
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
                    title: ' Tutup Paksa Sesi',
                    message: `Total ${unpaidCount} orang belum bayar. Nama mereka akan tercatat sebagai hutang di histori.`,
                    onConfirm: forceClose,
                    confirmText: 'Tutup Paksa',
                    danger: true
                  })}
                >
                  Tutup Paksa Sesi
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
          <span className="role-badge companion"> Kamu Pendamping</span>
          <h2>Halaman Pendamping</h2>
          <p className="text-secondary">Kamu menemani {session.payer} belanja kopi hari ini.</p>
        </div>

        <div className="dashboard-grid">
          {/* All Orders (read-only) */}
          <div className="panel glass-panel">
            <h3 className="section-title"> Semua Pesanan</h3>
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
                  <span className={o.isPaid ? 'badge-paid' : 'badge-unpaid'}>{o.isPaid ? ' Lunas' : ' Belum'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My Action */}
          <div className="panel glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {session.paymentInfo && (
              <div>
                <h3 className="section-title"> Info Transfer ke Pembayar</h3>
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
                <span></span><strong>Kopi sudah dibeli dan dalam perjalanan!</strong>
              </div>
            )}

            {myOrderC && !myOrderC.isPaid && session.status === 'active' && (
              <div>
                <h3 className="section-title"> Konfirmasi Pembayaranmu</h3>
                <p className="text-secondary text-sm mb-4">
                  Pesananmu: {myOrderC.item.emoji} {myOrderC.item.name} — <strong>{formatRp(myOrderC.item.price)}</strong>
                </p>
                <label className="upload-box-new mb-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden-file-input"
                    disabled={isUploadingActive}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setIsUploadingActive(true);
                      try {
                        const url = await api.uploadProof(file);
                        setProofInput(url);
                      } catch (err) { alert('Gagal upload.'); }
                      finally { setIsUploadingActive(false); }
                    }}
                  />
                  <div className="upload-content">
                    {isUploadingActive ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : proofInput ? (
                      <><CheckCircle className="text-green" size={20} /> <span className="text-xs">Siap Kirim</span></>
                    ) : (
                      <><Camera size={20} /> <span>Upload Bukti</span></>
                    )}
                  </div>
                </label>
                <button
                  id="companion-paid-btn"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  disabled={isUploadingActive}
                  onClick={() => markMyPayment(currentUser)}
                >
                  Tandai Sudah Bayar
                </button>
              </div>
            )}

            {myOrderC?.isPaid && <div className="success-banner"><span></span><strong>Pembayaranmu sudah dikonfirmasi!</strong></div>}

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
          <span className="role-badge penitip"> Penitip</span>
          <h2>Status Pesananmu</h2>
        </div>

        <div className="penitip-content">
          <Stepper steps={stepperSteps} currentStep={step} />

          <div className="penitip-card glass-panel">
            <h3 className="section-title"> Pesananmu</h3>
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
                <h4 className="text-secondary" style={{ marginBottom: '0.75rem' }}> Transfer ke:</h4>
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
                <span></span><strong>Kopi sudah dibeli! Dalam perjalanan ke kamu.</strong>
              </div>
            )}

            {myOrder && !alreadyPaid && step >= 1 && (
              <div className="file-input-wrapper mt-4">
                <label className="text-secondary text-sm mb-2 block">Kirim Bukti Pembayaran</label>
                <label className="upload-box-new active-upload">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden-file-input"
                    disabled={isUploadingActive}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setIsUploadingActive(true);
                      try {
                        const url = await api.uploadProof(file);
                        setProofInput(url);
                        // Auto-submit after upload for better UX in active session?
                        // Or let them click the button. Let's let them click.
                      } catch (err) {
                        alert('Gagal upload foto.');
                      } finally {
                        setIsUploadingActive(false);
                      }
                    }}
                  />
                  <div className="upload-content">
                    {isUploadingActive ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : proofInput ? (
                      <><CheckCircle className="text-green" size={20} /> <span className="text-xs">Foto Siap Kirim</span></>
                    ) : (
                      <><Camera size={20} /> <span>Pilih Cetak / Ambil Foto</span></>
                    )}
                  </div>
                </label>

                {proofInput && (
                  <div className="img-preview-active mt-3 mb-3">
                    <img src={proofInput} alt="Preview" className="rounded-md border" style={{ maxHeight: '150px' }} />
                  </div>
                )}

                <button
                  id="penitip-paid-btn"
                  className="btn-primary mt-2"
                  style={{ width: '100%' }}
                  disabled={isUploadingActive}
                  onClick={() => {
                    if (!proofInput && !confirm('Kamu belum upload bukti. Tetap tandai bayar (Cash)?')) return;
                    submitProof(currentUser);
                  }}
                >
                  {isUploadingActive ? 'Sedang Upload...' : '✅ Kirim Konfirmasi Pembayaran'}
                </button>
              </div>
            )}

            {alreadyPaid && (
              <div className="success-banner" style={{ marginTop: '1rem' }}>
                <span></span><strong>Pembayaran dikonfirmasi! Terima kasih. </strong>
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
        <span className="role-badge"> Penonton</span>
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
                ? (session.status === 'completed' ? ' Sesi Selesai' : ' Sesi Ditutup')
                : session.status === 'open'
                  ? ` ${formatTime(timeLeft)}`
                  : myRole === 'payer' ? ' Halaman Saya' : myRole === 'companion' ? ' Halaman Saya' : ' Pesanan Saya'}
            </button>
          )}
          {/* Admin Menu Restricted */}
          {currentUser.toLowerCase() === 'admin' && (
            <button className="btn-nav" onClick={() => setShowAdminPin(true)} title="Settings">
              ⚙️ Menu
            </button>
          )}

          <NotifBell
            notifications={session?.notifications || []}
            username={currentUser}
            onMarkRead={markNotifsRead}
            isOpen={activeMenu === 'notif'}
            onToggle={() => setActiveMenu(prev => prev === 'notif' ? null : 'notif')}
          />
          <UserProfile
            username={currentUser}
            onShowProfile={() => setShowProfileModal(true)}
            onShowHistory={() => goToHistory('all')}
            isOpen={activeMenu === 'profile'}
            onToggle={() => setActiveMenu(prev => prev === 'profile' ? null : 'profile')}
            onLogout={() => setDialog({ title: 'Ingin Keluar?', message: 'Apakah kamu yakin ingin logout?', onConfirm: logout, onCancel: () => setDialog(null), danger: true, confirmText: 'Keluar' })}
          />
        </div>
      </nav>

      <main className="main-content">
        {view === 'home' && renderHome()}
        {view === 'session' && renderSession()}
        {view === 'admin' && (
          <div className="role-layout fade-in">
            <div className="panel glass-panel" style={{ maxWidth: '800px', margin: '2rem auto' }}>
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
                onClose={() => setView('home')}
              />
            </div>
          </div>
        )}
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
      {showProfileModal && (
        <ProfileModal
          username={currentUser}
          onSave={onUpdateProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {view === 'history' && (
        <HistoryView
          history={store.history}
          payerHistory={store.payerHistory}
          currentUser={currentUser}
          filter={historyFilter}
          setFilter={setHistoryFilter}
          onClose={() => setView('home')}
        />
      )}

    </div>
  );
}
