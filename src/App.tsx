import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const AuthScreen = lazy(() => import('./auth/AuthScreen').then(module => ({ default: module.AuthScreen })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const EditorPage = lazy(() => import('./components/EditorPage').then(module => ({ default: module.EditorPage })));
const SharedPage = lazy(() => import('./components/SharedPage').then(module => ({ default: module.SharedPage })));

export function App() {
  const { user, loading, configured } = useAuth();
  if (loading) return <div className="loading-screen"><span className="loader-mark" /><span>Opening your studio…</span></div>;
  return <Suspense fallback={<div className="loading-screen"><span className="loader-mark" /><span>Opening your studio…</span></div>}>
    <Routes>
      <Route path="/share/:token" element={<SharedPage />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthScreen />} />
      <Route path="/editor/:id" element={user ? <EditorPage /> : <AuthScreen />} />
      <Route path="*" element={user && configured ? <Dashboard /> : <AuthScreen />} />
    </Routes>
  </Suspense>;
}
