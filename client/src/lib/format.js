export function formatRupiah(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    }).format(d);
  } catch { return dateStr; }
}

export function formatDatetime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch { return dateStr; }
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function statusBadge(status) {
  const map = {
    valid: { label: '✓ Valid', cls: 'badge-valid' },
    cek_manual: { label: '⚠ Cek Manual', cls: 'badge-manual' },
    koreksi: { label: '↺ Koreksi', cls: 'badge-koreksi' },
    lainnya: { label: '— Lainnya', cls: 'badge-lainnya' },
    matched: { label: '✓ Matched', cls: 'badge-valid' },
    pending: { label: '⏳ Pending', cls: 'badge-manual' },
  };
  return map[status] || { label: status, cls: 'badge-lainnya' };
}
