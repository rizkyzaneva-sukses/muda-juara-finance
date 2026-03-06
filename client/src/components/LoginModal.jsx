import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ onClose }) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await login(password);
      onClose();
    } catch {
      setError('Password salah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-700 border border-white/10 rounded-2xl w-full max-w-sm p-6 fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Lock size={16} className="text-gold-400" />
            </div>
            <div>
              <div className="font-display font-bold text-white">Admin Login</div>
              <div className="text-xs text-white/40">Muda Juara Finance</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Password Admin</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Masukkan password..."
                className="input pr-10"
                autoFocus
              />
              <button
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !password}
            className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memverifikasi...' : 'Masuk sebagai Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
