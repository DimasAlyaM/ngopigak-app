import { Loader2, Users, Coffee, Bell, Camera, Shield, Info, AlertTriangle, CheckCircle, ChevronDown, Clock, Search } from 'lucide-react';
import { useAppStore } from "../context/useAppStore.js";
import { formatRp, formatTime } from '../utils/formatters.js';
import UserAvatar from '../components/UserAvatar';
import PaymentInfoCard from '../components/PaymentInfoCard';
import Stepper from '../components/Stepper';

function SessionView({ 
  timeLeft,
  setView,
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
  const { store, currentUser } = useAppStore();
  const session = store.session;

  if (!session) {
    return (
      <div className="empty-state fade-in session-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="login-logo">
          <Coffee size={40} />
        </div>
        <h2 className="mb-2">Belum ada sesi</h2>
        <p className="text-secondary mb-8">Mulai sesi ngopi sekarang untuk berbagi bareng teman.</p>
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

  const myOrder = session?.orders?.find(o => o.userId === currentUser?.id);

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
      <div className="session-summary fade-in session-container">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div className="mb-6" style={{ color: isForced ? 'var(--accent-primary)' : 'var(--success)' }}>
            {isForced ? <AlertTriangle size={72} /> : <CheckCircle size={72} />}
          </div>
          <h2 className="mb-2">{isForced ? 'Sesi Ditutup' : 'Sesi Selesai!'}</h2>
          <p className="text-secondary mb-8">
            {isForced ? 'Ditutup sebelum semua bayar.' : 'Semua pesanan sudah lunas.'}
          </p>

          <div className="stat-card mb-8" style={{ background: 'var(--bg-primary)' }}>
            <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary font-bold" style={{ fontSize: '0.8rem' }}>TOTAL PUTARAN</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--accent-light)' }}>{formatRp(totalSession)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary font-bold" style={{ fontSize: '0.8rem' }}>TOTAL PESERTA</span>
              <strong style={{ fontSize: '1.1rem' }}>{orders.length} Orang</strong>
            </div>
          </div>

          <button className="btn-primary" onClick={() => setView('home')}>Kembali ke Home</button>
        </div>
      </div>
    );
  };

  const renderOpenSession = () => (
    <div className="session-open-view fade-in session-container">
      <div className="glass-panel mb-6" style={{ position: 'relative' }}>
        <div className={`timer-badge ${timeLeft < 60 ? 'urgent' : ''}`} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <Clock size={16} />
          <span>{formatTime(timeLeft)}</span>
        </div>
        
        <div className="mb-6">
          <h3 className="mb-1">Sesi Terbuka</h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Pilih kopi kamu sebelum timer habis.</p>
        </div>

        <form onSubmit={onAddOrder} className="modern-form">
          <div className="form-group" ref={coffeeDropdownRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Cari kopi kesukaanmu..."
                className="premium-input"
                value={coffeeSearch}
                onFocus={() => setShowMenuResults(true)}
                onChange={(e) => setCoffeeSearch(e.target.value)}
                style={{ paddingLeft: '3rem' }}
              />
              <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                <Search size={20} />
              </div>
            </div>

            {showMenuResults && (
              <div className="search-results-overlay">
                {(store.menu || []).filter(m => m && m.name.toLowerCase().includes(coffeeSearch.toLowerCase())).map(m => (
                  <div
                    key={m.id}
                    className="search-result-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedCoffeeId(m.id);
                      setCoffeeSearch(`${m.emoji} ${m.name}`);
                      setShowMenuResults(false);
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{m.emoji} {m.name}</span>
                    <span className="text-accent" style={{ fontWeight: 800 }}>{formatRp(m.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary mt-4" type="submit">
            {myOrder ? 'Update Pesanan' : 'Tambah Pesanan'}
          </button>
        </form>
      </div>

      <div className="order-list-section">
        <div className="section-header mb-4">
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Daftar Pesanan ({session.orders?.length || 0})</h4>
        </div>
        <div className="card-stack">
          {(session.orders || []).map(o => (
            <div key={o.id} className={`order-item-card ${o.userId === currentUser?.id ? 'my-order' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserAvatar username={o.username} size={40} />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{o.username}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{o.item?.emoji || '☕'} {o.item?.name || 'Item'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong className="text-accent" style={{ fontSize: '1rem' }}>{formatRp(o.item?.price || 0)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <button className="btn-secondary" onClick={onCloseSessionNow} style={{ color: 'var(--text-tertiary)' }}>
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
      <div className="payer-view fade-in session-container">
        <div className="payment-card-highlight mb-6">
          <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge-role payer">Kamu Pembayar</span>
            <span className="text-secondary font-bold" style={{ fontSize: '0.75rem' }}>{paidCount}/{nonPayer.length} Lunas</span>
          </div>
          <p className="text-secondary font-bold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Tagihan</p>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white' }}>{formatRp(totalAmount)}</h2>
          
          <div className="mt-6" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={onConfirmBought} disabled={session.coffeeBought}>
              {session.coffeeBought ? 'Kopi Sudah Dibeli ✅' : 'Kopi Sudah Dibeli'}
            </button>
            <button className="btn-secondary" style={{ width: '56px', height: '56px', borderRadius: '18px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onRemindAll}>
              <Bell size={24} />
            </button>
          </div>
        </div>

        <div className="order-management">
          <div className="section-header mb-4">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Status Peserta</h4>
          </div>
          <div className="card-stack">
            {(session.orders || []).map(o => (
              <div key={o.id} className="order-item-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <UserAvatar username={o.username} size={44} />
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      {o.username} {o.userId === session.payerId && <span className="text-accent" style={{ fontSize: '0.7rem' }}>(Kamu)</span>}
                    </p>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{o.item?.emoji || '☕'} {o.item?.name || 'Item'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{formatRp(o.item?.price || 0)}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {o.paymentProof && (
                      <button
                        className="btn-secondary"
                        onClick={() => setPreviewProof({ url: o.paymentProof, username: o.username, userId: o.userId })}
                        style={{ padding: '6px 10px', borderRadius: '10px', height: 'auto', background: 'rgba(230, 145, 56, 0.1)', borderColor: 'transparent' }}
                      >
                        <Camera size={16} className="text-accent" />
                      </button>
                    )}
                    {o.userId !== session.payerId ? (
                      <button
                        className={`badge-role ${o.isPaid ? 'guest' : 'payer'}`}
                        style={{ border: 'none', cursor: 'pointer', padding: '6px 12px' }}
                        onClick={() => !o.isPaid && onMarkPaidByPayer(o.userId)}
                      >
                        {o.isPaid ? 'LUNAS ✅' : 'Tandai Lunas'}
                      </button>
                    ) : (
                      <span className="badge-role guest" style={{ opacity: 0.6 }}>PAYER</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!sessionDone && (
          <div className="mt-12 mb-8">
            <button className="btn-secondary" style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => setDialog({ title: 'Tutup Paksa?', message: 'Hutang peserta akan dicatat.', onConfirm: onForceClose, danger: true, confirmText: 'Ya, Tutup' })}>
              Tutup Paksa Sesi
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCompanionPage = () => (
    <div className="companion-view fade-in session-container">
      <div className="glass-panel mb-6" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="mb-6" style={{ background: 'rgba(74, 222, 128, 0.1)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <Users size={40} style={{ color: 'var(--success)' }} />
        </div>
        <span className="badge-role companion mb-4">Kamu Pendamping</span>
        <h2 className="mb-3">Bantu {session.payer} Ambil Kopi!</h2>
        <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>Tugas kamu adalah menemani pembayar hari ini ke kedai kopi.</p>
      </div>
      {renderPenitipPage()}
    </div>
  );

  const renderPenitipPage = () => {
    const alreadyPaid = myOrder?.isPaid;
    return (
      <div className="penitip-view fade-in session-container">
        <div className="glass-panel mb-6">
          <div className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge-role guest">Status Pesanan</span>
            {alreadyPaid ? <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 800 }}>LUNAS ✅</span> : <span style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 800 }}>BELUM BAYAR ⏳</span>}
          </div>
          <div className="mb-8" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '3.5rem', background: 'var(--bg-primary)', width: '96px', height: '96px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>{myOrder?.item?.emoji || '☕'}</div>
            <div>
              <h3 className="mb-1" style={{ fontSize: '1.5rem' }}>{myOrder?.item?.name || 'Pesanan'}</h3>
              <p className="text-accent" style={{ fontSize: '1.75rem', fontWeight: 800 }}>{formatRp(myOrder?.item?.price || 0)}</p>
            </div>
          </div>
          <PaymentInfoCard info={session.paymentInfo} payer={session.payer} companion={session.companion} />
        </div>

        {!alreadyPaid && (
          <div className="payment-card-highlight text-center" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div className="mb-6" style={{ background: 'rgba(255,255,255,0.05)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Info size={32} className="text-accent" />
            </div>
            {myOrder?.paymentProof ? (
              <>
                <h4 className="mb-2" style={{ fontSize: '1.25rem' }}>Bukti Terkirim!</h4>
                <p className="text-secondary mb-8" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>Pembayaranmu sedang diverifikasi oleh <strong>{session.payer}</strong>.</p>
              </>
            ) : (
              <>
                <h4 className="mb-2" style={{ fontSize: '1.25rem' }}>Cara Bayar</h4>
                <p className="text-secondary mb-8" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>Silakan transfer ke rekening di atas, lalu upload bukti di menu <strong>My Order</strong>.</p>
              </>
            )}
            <button className="btn-primary" style={{ background: 'white', color: 'var(--accent-primary)' }} onClick={() => setView('orders')}>Buka My Order</button>
          </div>
        )}
      </div>
    );
  };

  const renderGuestPage = () => (
    <div className="guest-view fade-in session-container" style={{ paddingTop: '3rem' }}>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <div className="mb-6" style={{ background: 'var(--bg-primary)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <Coffee size={40} className="text-secondary" />
        </div>
        <h2 className="mb-2">Kamu Sedang Menonton</h2>
        <p className="text-secondary mb-10">Tunggu sesi berikutnya untuk memesan!</p>
        
        <div className="stat-card mb-8" style={{ textAlign: 'left' }}>
          <div className="participants-showcase" style={{ gap: '16px' }}>
            <div>
              <p className="text-secondary font-bold uppercase mb-2" style={{ fontSize: '0.65rem' }}>Payer</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserAvatar username={session.payer} size={32} />
                <strong style={{ fontSize: '1rem' }}>{session.payer}</strong>
              </div>
            </div>
            {session.companion && (
              <div>
                <p className="text-secondary font-bold uppercase mb-2" style={{ fontSize: '0.65rem' }}>Companion</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserAvatar username={session.companion} size={32} />
                  <strong style={{ fontSize: '1rem' }}>{session.companion}</strong>
                </div>
              </div>
            )}
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
    const isPayer = session.payerId === currentUser?.id;
    return (
      <div className="payment-setup fade-in session-container">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <h2 className="mb-8">Relawan Terpilih! 🚀</h2>
          
          <div className={`participants-showcase mb-10 ${session.companion ? 'dual' : ''}`}>
            <div className="participant-box active">
              <UserAvatar username={session.payer} size={72} />
              <p className="badge-role payer mt-4 mb-2" style={{ display: 'inline-block' }}>Payer</p>
              <h3 style={{ fontSize: '1.25rem' }}>{session.payer}</h3>
            </div>
            {session.companion && (
              <div className="participant-box" style={{ borderColor: 'var(--success-border)' }}>
                <UserAvatar username={session.companion} size={72} />
                <p className="badge-role companion mt-4 mb-2" style={{ display: 'inline-block' }}>Companion</p>
                <h3 style={{ fontSize: '1.25rem' }}>{session.companion}</h3>
              </div>
            )}
          </div>

          {isPayer ? (
            <div className="text-left">
              <h4 className="mb-4" style={{ fontWeight: 800 }}>Lengkapi Info Pembayaran</h4>
              <form onSubmit={onSubmitPaymentInfo} className="modern-form">
                <div className="form-group mb-4">
                  <select className="premium-input w-full" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                    <option value="" disabled>Pilih Metode Pembayaran</option>
                    <option value="BANK">Transfer Bank</option>
                    <option value="GOPAY">GoPay / ShopeePay</option>
                    <option value="DANA">DANA / OVO</option>
                  </select>
                </div>
                {paymentMethod === 'BANK' && (
                  <div className="form-group mb-4">
                    <input type="text" className="premium-input w-full" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Contoh: BCA / Mandiri" required />
                  </div>
                )}
                <div className="form-group mb-6">
                  <input type="text" className="premium-input w-full" value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="No Rekening / No HP" required />
                </div>
                <button className="btn-primary" type="submit">Aktifkan Sesi Sekarang</button>
              </form>
            </div>
          ) : (
            <div style={{ background: 'rgba(230, 145, 56, 0.05)', padding: '1.5rem', borderRadius: '20px', border: '1px dashed var(--accent-primary)' }}>
              <p className="text-secondary" style={{ fontWeight: 600 }}>Menunggu <strong>{session.payer}</strong> mengisi informasi pembayaran...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (session.status === 'active') {
    return (
      <div className="session-view fade-in">
        <Stepper steps={['Pilih Menu', 'Pembayaran', 'Kopi Dibeli', 'Selesai']} currentStep={getStepIndex()} />
        {myRole === 'payer' && renderPayerPage()}
        {myRole === 'companion' && renderCompanionPage()}
        {myRole === 'penitip' && renderPenitipPage()}
        {!myRole && renderGuestPage()}
      </div>
    );
  }

  return (
    <div className="empty-state session-container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <Loader2 size={48} className="spin text-accent mb-6" style={{ margin: '0 auto' }} />
      <p className="text-secondary" style={{ fontWeight: 600 }}>Menyampaikan data...</p>
    </div>
  );
}

export default SessionView;
