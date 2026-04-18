import { useAppStore } from "../context/useAppStore.js";
import { api } from "../store.js";

/**
 * AdminPinGate Component
 */
function AdminPinGate({ onSuccess, onClose }) {
  const { store } = useAppStore();
  const serverPin = store.adminPin;
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

export default AdminPinGate;
