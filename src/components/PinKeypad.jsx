import { Delete } from 'lucide-react';

/**
 * PinKeypad Component
 * A reusable touch-friendly keypad for PIN entry
 */
const PinKeypad = ({ onKeyPress, onDelete, onSubmit, submitLabel = 'OK' }) => {
  return (
    <div className="keypad-grid">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <div 
          key={num} 
          className="key-btn" 
          onClick={() => onKeyPress(num.toString())}
        >
          {num}
        </div>
      ))}
      <div className="key-btn special" onClick={onDelete}>
        <Delete size={24} />
      </div>
      <div className="key-btn" onClick={() => onKeyPress('0')}>
        0
      </div>
      <div 
        className="key-btn special" 
        onClick={onSubmit} 
        style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}
      >
        {submitLabel}
      </div>
    </div>
  );
};

export default PinKeypad;
