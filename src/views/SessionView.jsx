import { Loader2, Users, Coffee, Bell, Camera, Shield, Info, AlertTriangle, CheckCircle, ChevronDown, Clock, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatRp, formatTime } from '../utils/formatters.js';
import UserAvatar from '../components/UserAvatar';
import PaymentInfoCard from '../components/PaymentInfoCard';
import Stepper from '../components/Stepper';

function SessionView({ 
  timeLeft,
  setView,
  setSelectedSession,
  setSelectedOrder,
  setDialog,
  setPreviewProof,
  paymentMethod,
  setPaymentMethod,
  bankName,
  setBankName,
  accountNo,
  setAccountNo,
  coffeeSearch,
  setCoffeeSearch,
  showMenuResults,
  setShowMenuResults,
  coffeeDropdownRef,
  selectedCoffeeId,
  setSelectedCoffeeId,
  onAddOrder,
  onStartSession,
  onConfirmBought,
  onRemindAll,
  onMarkPaidByPayer,
  onForceClose,
  onSubmitPaymentInfo,
  onCloseSessionNow
}) {
  const { store, currentUser } = useAppContext();
  const session = store.session;

  if (!session) {
    return (
      <div className="empty-state fade-in" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
          <Coffee size={40} className="text-secondary" />
        </div>
        <h2 className="text-secondary">Belum ada sesi</h2>
        <p className="text-secondary" style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>Mulai sesi ngopi sekarang untuk berbagi bareng teman.</p>
        <button className="btn-primary" onClick={onStartSession}>Buka Sesi Baru</button>
      </div>
    );
  }

  const sessionDone = session.status === 'completed' || session.status === 'force-closed';
  const myRole = (() => {
    if (!session || !currentUser) return null;
    if (session.payerId === currentUser.id) return 'payer';
    if (session.companionId === currentUser.id) return 'companion';
    if (session.orders.some(o => o.userId === currentUser.id)) return 'penitip';
    return null;
  })();

  const myOrder = session?.orders?.find(o => o.userId === currentUser.id);

  // Statistics
  const totalAmount = session?.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
  
  const getStepIndex = () => {
    if (!session) return 0;
    if (session.status === 'open' || session.status === 'payment-setup') return 0;
    if (session.status === 'active' && !session.coffeeBought) return 1;
    if (session.status === 'active' && session.coffeeBought) return 2;
    if (session.status === 'completed') return 3;
    return 0;
  };

  // ─── INTERNAL RENDER HELPERS ───────────────────────────────────────────

  const renderTerminalPage = () => {
    const isForced = session.status === 'force-closed';
    const orders = session.orders || [];
    const totalSession = orders.reduce((sum, o) => sum + (o.item?.price || 0), 0);
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
              <strong style={{ fontSize: '1.1rem' }}>{orders.length} orang</strong>
            </div>
          </div>

          <button className="btn-primary" onClick={() => setView('home')}>Kembali ke Home</button>
        </div>
      </div>
    );
  };

  const renderOpenSession = () => (
    <div className="session-open-view fade-in" style={{ padding: '1rem' }}>
      <div className="glass-panel" style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <div
          className={`timer-chip ${timeLeft < 60 ? 'urgent' : ''}`}
          style={{
            position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-primary)',
            padding: '6px 14px', borderRadius: '12px', fontWeight: 900, color: 'white',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Clock size={14} />
          {formatTime(timeLeft)}
        </div>
        <h3 style={{ marginBottom: '0.5rem' }}>Sesi Terbuka</h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Pilih kopi kamu sebelum timer habis.</p>

        <form onSubmit={onAddOrder} style={{ marginTop: '1.5rem' }}>
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
                <Search size={20} />
              </div>
              {showMenuResults && (
                <div className="glass-panel search-results-list" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 1000, maxHeight: '250px', overflowY: 'auto', padding: '8px' }}>
                  {(store.menu || []).filter(m => m && m.name.toLowerCase().includes(coffeeSearch.toLowerCase())).map(m => (
                    <div
                      key={m.id}
                      className="search-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedCoffeeId(m.id);
                        setCoffeeSearch(`${m.emoji} ${m.name}`);
                        setShowMenuResults(false);
                      }}
                      style={{ padding: '14px 12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontWeight: 700 }}>{m.emoji} {m.name}</span>
                      <span className="text-accent" style={{ fontWeight: 800 }}>{formatRp(m.price)}</span>
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
        <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Daftar Pesanan ({session.orders?.length || 0})</h4>
        <div className="card-stack">
          {(session.orders || []).map(o => (
            <div key={o.id} className={`item-card glass-panel ${o.userId === currentUser.id ? 'active-border' : ''}`} style={{ padding: '12px 16px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserAvatar username={o.username} size={36} />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item?.emoji || '☕'} {o.item?.name || 'Item'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong className="text-accent">{formatRp(o.item?.price || 0)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-actions" style={{ marginTop: '2rem' }}>
        <button className="btn-secondary" onClick={onCloseSessionNow} style={{ width: '100%', borderRadius: '20px', borderColor: 'rgba(255,255,255,0.1)' }}>
          Tutup Sesi Sekarang
        </button>
      </div>
    </div>
  );

  const renderPayerPage = () => {
    const orders = session.orders || [];
    const nonPayer = orders.filter(o => o.userId !== session.payerId);
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
            <button className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={onConfirmBought} disabled={session.coffeeBought}>
              {session.coffeeBought ? 'Kopi Sudah Dibeli ✅' : 'Kopi Sudah Dibeli'}
            </button>
            <button className="btn-secondary" style={{ padding: '10px' }} onClick={onRemindAll}><Bell size={18} /></button>
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
                      {o.username} {o.userId === session.payerId && <span className="text-accent" style={{ fontSize: '0.7rem' }}>(Kamu)</span>}
                    </p>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>{o.item?.emoji || '☕'} {o.item?.name || 'Item'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <p style={{ fontWeight: 800 }}>{formatRp(o.item?.price || 0)}</p>
                  {o.userId !== session.payerId ? (
                    <button
                      className={`badge ${o.isPaid ? 'badge-glass' : 'badge-amber'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => !o.isPaid && onMarkPaidByPayer(o.userId)}
                    >
                      {o.isPaid ? 'LUNAS ✅' : 'Tandai Lunas'}
                    </button>
                  ) : (
                    <span className="badge badge-glass" style={{ opacity: 0.6 }}>PAYER</span>
                  )}
                  {o.paymentProof && (
                    <div
                      onClick={() => setPreviewProof({ url: o.paymentProof, username: o.username, userId: o.userId })}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 8px', background: 'rgba(230, 145, 56, 0.1)', borderRadius: '8px', border: '1px solid rgba(230, 145, 56, 0.2)' }}
                    >
                      <Camera size={14} className="text-accent" />
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Lihat Bukti</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!sessionDone && (
          <div style={{ marginTop: '2.5rem', paddingBottom: '2rem' }}>
            <button className="btn-secondary" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => setDialog({ title: 'Tutup Paksa?', message: 'Hutang peserta akan dicatat.', onConfirm: onForceClose, danger: true, confirmText: 'Ya, Tutup' })}>
              Tutup Paksa Sesi
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCompanionPage = () => (
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

  const renderPenitipPage = () => {
    const alreadyPaid = myOrder?.isPaid;
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
          <PaymentInfoCard info={session.paymentInfo} payer={session.payer} companion={session.companion} />
        </div>
        {!alreadyPaid && (
          <div className="payment-guide glass-panel-premium" style={{ marginTop: '1.5rem', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ background: 'var(--surface)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Info size={28} className="text-accent" /></div>
            {myOrder?.paymentProof ? (
              <>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Bukti Terkirim!</h4>
                <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>Pembayaranmu sedang diverifikasi oleh <strong>{session.payer}</strong>.</p>
              </>
            ) : (
              <>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Cara Bayar</h4>
                <p className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>Silakan transfer ke rekening di atas, lalu upload bukti di menu <strong>My Order</strong>.</p>
              </>
            )}
            <button className="btn-primary-pill" style={{ width: '100%' }} onClick={() => setView('orders')}>Buka My Order</button>
          </div>
        )}
      </div>
    );
  };

  const renderGuestPage = () => (
    <div className="guest-view fade-in" style={{ padding: '2rem' }}>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}><Coffee size={40} className="text-secondary" /></div>
        <h2 style={{ marginBottom: '1rem' }}>Kamu Sedang Menonton</h2>
        <p className="text-secondary" style={{ marginBottom: '2.5rem' }}>Tunggu sesi berikutnya untuk memesan!</p>
        <div className="status-mini-card" style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '20px', textAlign: 'left', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: session.companion ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <div><p style={{ fontSize: '0.7rem', marginBottom: '6px' }} className="text-secondary uppercase font-bold">Payer</p><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserAvatar username={session.payer} size={24} /><strong>{session.payer}</strong></div></div>
            {session.companion && <div><p style={{ fontSize: '0.7rem', marginBottom: '6px' }} className="text-secondary uppercase font-bold">Companion</p><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserAvatar username={session.companion} size={24} /><strong>{session.companion}</strong></div></div>}
          </div>
        </div>
        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setView('home')}>Kembali ke Home</button>
      </div>
    </div>
  );

  // ─── MAIN ROUTING ────────────────────────────────────────────────────────────

  if (sessionDone) return renderTerminalPage();
  
  if (session.status === 'open') return renderOpenSession();

  if (session.status === 'payment-setup') {
    const isPayer = session.payerId === currentUser.id;
    return (
      <div className="payment-setup fade-in" style={{ padding: '1.5rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <h2 style={{ marginBottom: '2rem' }}>Relawan Terpilih!</h2>
          <div className="roles-showcase dual-roles" style={{ display: 'grid', gridTemplateColumns: session.companion ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '2.5rem' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '1.5rem 1rem', borderRadius: '24px', border: '2px solid var(--accent-primary)' }}>
              <UserAvatar username={session.payer} size={64} /><h3 style={{ fontSize: '1.2rem', marginTop: '0.75rem' }}>{session.payer}</h3>
            </div>
            {session.companion && <div style={{ background: 'var(--bg-primary)', padding: '1.5rem 1rem', borderRadius: '24px', border: '1px solid rgba(74, 222, 128, 0.3)' }}><UserAvatar username={session.companion} size={64} /><h3 style={{ fontSize: '1.2rem', marginTop: '0.75rem' }}>{session.companion}</h3></div>}
          </div>
          {isPayer ? (
            <form onSubmit={onSubmitPaymentInfo} className="modern-form" style={{ textAlign: 'left' }}>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                <option value="" disabled>Pilih Metode</option>
                <option value="BANK">Bank Transfer</option><option value="GOPAY">GoPay / ShopeePay</option><option value="DANA">DANA / OVO</option>
              </select>
              {paymentMethod === 'BANK' && <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Nama Bank" required />}
              <input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="No Rekening / No HP" required />
              <button className="btn-primary" type="submit" style={{ marginTop: '1rem' }}>Aktifkan Sesi</button>
            </form>
          ) : <p className="text-secondary">Menunggu {session.payer} mengisi info...</p>}
        </div>
      </div>
    );
  }

  if (session.status === 'active') {
    return (
      <div className="session-view fade-in">
        <Stepper steps={['Menunggu Pembayar', 'Silakan Bayar', 'Kopi Dibeli', 'Selesai']} currentStep={getStepIndex()} />
        {myRole === 'payer' && renderPayerPage()}
        {myRole === 'companion' && renderCompanionPage()}
        {myRole === 'penitip' && renderPenitipPage()}
        {!myRole && renderGuestPage()}
      </div>
    );
  }

  return (
    <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <Loader2 size={40} className="animate-spin text-secondary mb-4" />
      <p className="text-secondary">Menyampaikan data...</p>
    </div>
  );
}

export default SessionView;
