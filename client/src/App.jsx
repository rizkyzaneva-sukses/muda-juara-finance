import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import Laporan from './pages/Laporan';
import Upload from './pages/Upload';
import Rekonsiliasi from './pages/Rekonsiliasi';
import Koreksi from './pages/Koreksi';
import MasterData from './pages/MasterData';
import DevRoom from './pages/DevRoom';

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="text-center py-20 text-white/30">Memuat...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transaksi" element={<Transaksi />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/upload" element={<AdminRoute><Upload /></AdminRoute>} />
        <Route path="/rekonsiliasi" element={<AdminRoute><Rekonsiliasi /></AdminRoute>} />
        <Route path="/koreksi" element={<AdminRoute><Koreksi /></AdminRoute>} />
        <Route path="/master-data" element={<AdminRoute><MasterData /></AdminRoute>} />
        <Route path="/dev" element={<AdminRoute><DevRoom /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
