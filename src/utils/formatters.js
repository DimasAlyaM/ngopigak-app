/**
 * Formatting utilities for NgopiGakApp
 */

export function formatRp(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
