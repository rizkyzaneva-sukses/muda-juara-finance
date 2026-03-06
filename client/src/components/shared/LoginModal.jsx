import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ onClose }) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(password);
      toast.success('Login berhasil! Mode admin aktif.');
      onClose();
    } catch {
      toast.error('Password salah!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold-500/10 rounded-lg flex items-center justify-center">
              <Lock size={16} className="text-gold-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Admin Login</div>
              <div className="text-xs text-gray-500">Muda Juara Finance</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Masukkan password admin"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button type="submit" disabled={loading || !password} className="btn-primary w-full">
            {loading ? 'Memverifikasi...' : 'Masuk sebagai Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
