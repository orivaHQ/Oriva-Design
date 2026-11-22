import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthScreen } from './auth/AuthScreen';
import { useAuth } from './auth/AuthContext';
import { Dashboard } from './components/Dashboard';
import { EditorPage } from './components/EditorPage';
import { SharedPage } from './components/SharedPage';
import { supabase } from './lib/supabase';

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><span className="loader-mark" /><span>Opening your studio…</span></div>;
  return <Routes>
    <Route path="/share/:token" element={<SharedPage />} />
    <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthScreen />} />
    <Route path="/editor/:id" element={user ? <EditorPage /> : <AuthScreen />} />
    <Route path="*" element={user && supabase ? <Dashboard /> : <AuthScreen />} />
  </Routes>;
}
