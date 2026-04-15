import React from 'react';

/**
 * StatusBadge Component
 * Displays 'LUNAS' or 'HUTANG' with appropriate styling.
 */
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

export default StatusBadge;
