import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function ProtectedDashboardRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  return <DashboardPage />;
}

function AppRoutes() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-8">
        <p className="text-slate-300">Loading session…</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? `/dashboard/${user.id}` : '/login'} replace />}
      />
      <Route path="/dashboard/:userId" element={<ProtectedDashboardRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
