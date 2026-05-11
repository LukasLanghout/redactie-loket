import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, isStaff } from '../hooks/useAuth';

export function ProtectedRoute({ children, staffOnly = false }: { children: ReactNode; staffOnly?: boolean }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Laden…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (staffOnly && !isStaff(profile)) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Geen toegang</h2>
        <p className="text-slate-500">Alleen redactieleden kunnen deze pagina openen.</p>
      </div>
    );
  }
  return <>{children}</>;
}
