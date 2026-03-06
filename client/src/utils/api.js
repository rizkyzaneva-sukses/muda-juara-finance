import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mj_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mj_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default api;

export const formatRupiah = (n) => {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const statusBadge = (status) => {
  const map = {
    valid: 'badge-valid',
    cek_manual: 'badge-cek',
    koreksi: 'badge-koreksi',
    lainnya: 'badge-lainnya',
    pending: 'badge-cek',
    matched: 'badge-valid',
  };
  const label = {
    valid: '✅ Valid', cek_manual: '⚠️ Cek Manual',
    koreksi: '🔄 Koreksi', lainnya: '— Lainnya',
    pending: '⏳ Pending', matched: '✅ Matched'
  };
  return { cls: map[status] || 'badge-lainnya', label: label[status] || status };
};
