import { useState, useEffect } from 'react';
import { Lock, Shield, ArrowLeft } from 'lucide-react';
import { useAppStore } from "../context/useAppStore.js";
import { api } from "../store.js";
import PinKeypad from '../components/PinKeypad';

/**
 * AdminPinGate Component
 * Improved UI/UX with touch-friendly keypad and visual indicators
 */
function AdminPinGate({ onSuccess, onClose }) {
  const { store } = useAppStore();
  const serverPin = store.adminPin;
  const isFirstTime = !serverPin;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKeyPress = (num) => {
    if (error) setError('');
    if (isConfirming) {
      if (confirmPin.length < 8) setConfirmPin(prev => prev + num);
    } else {
      if (pin.length < 8) setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = () => {
    const currentPin = isConfirming ? confirmPin : pin;
    
    if (currentPin.length < 4) {
      setError('PIN minimal 4 digit.');
      triggerShake();
      return;
    }

    if (isFirstTime) {
      if (!isConfirming) {
        setIsConfirming(true);
        return;
      }
      
      if (pin !== confirmPin) {
        setError('PIN tidak cocok, coba lagi.');
        triggerShake();
        setPin('');
        setConfirmPin('');
        setIsConfirming(false);
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

  // Auto-submit for login if length matches
  useEffect(() => {
    if (!isFirstTime && serverPin && pin.length === serverPin.length) {
      handleSubmit();
    }
  }, [pin]);

  const displayLength = isConfirming ? confirmPin.length : pin.length;
  const dotsCount = isFirstTime ? 4 : (serverPin?.length || 4);

  return (
    <div className="pin-view-container fade-in">
      <div className={`pin-view-card ${shake ? 'shake' : ''}`}>
        <div className="pin-view-icon">
          {isFirstTime ? <Lock size={32} /> : <Shield size={32} />}
        </div>

        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>
          {isFirstTime 
            ? (isConfirming ? 'Konfirmasi PIN' : 'Buat PIN Admin') 
            : 'Masukkan PIN Admin'}
        </h2>

        <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
          {isFirstTime
            ? (isConfirming ? 'Masukkan PIN sekali lagi untuk memastikan.' : 'Lindungi akses manajemen dengan PIN baru.')
            : 'Gunakan PIN admin untuk membuka Control Center.'}
        </p>

        {/* PIN Indicators */}
        <div className="pin-display">
          {[...Array(Math.max(dotsCount, displayLength))].map((_, i) => (
            <div 
              key={i} 
              className={`pin-dot ${i < displayLength ? 'active' : ''}`} 
            />
          ))}
        </div>

        {error && <p className="text-red mb-4 font-bold" style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</p>}

        <PinKeypad 
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
          submitLabel={isFirstTime && !isConfirming ? 'LANJUT' : 'MASUK'}
        />

        <div style={{ marginTop: '2rem' }}>
          <button 
            type="button" 
            className="text-secondary font-bold" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              fontSize: '0.9rem'
            }} 
            onClick={isConfirming ? () => { setIsConfirming(false); setConfirmPin(''); } : onClose}
          >
            <ArrowLeft size={16} />
            {isConfirming ? 'Ganti PIN' : 'Kembali ke Beranda'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPinGate;
