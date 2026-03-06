import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mj_token');
    if (token) {
      api.post('/auth/verify').then(res => {
        setIsAdmin(res.data.valid);
      }).catch(() => {
        localStorage.removeItem('mj_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (password) => {
    const res = await api.post('/auth/login', { password });
    localStorage.setItem('mj_token', res.data.token);
    setIsAdmin(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('mj_token');
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
