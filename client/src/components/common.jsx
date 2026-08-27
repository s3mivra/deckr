import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || 'Something went wrong';
  return <div className="error-banner">{msg}</div>;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export function AchievementToasts({ keys, catalog }) {
  // small helper to render a friendly message when achievements unlock
  if (!keys || keys.length === 0) return null;
  const names = keys
    .map((k) => catalog.find((a) => a.key === k)?.name || k)
    .join(', ');
  return <>Achievement unlocked: {names}</>;
}
