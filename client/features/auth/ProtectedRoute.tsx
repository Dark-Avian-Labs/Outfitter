import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { APP_PATHS } from '../../app/paths';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { auth } = useAuth();

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted text-sm">Checking session...</p>
      </div>
    );
  }
  if (auth.status !== 'authenticated') {
    return <Navigate to={APP_PATHS.signIn} replace />;
  }
  if (requireAdmin && !auth.isAdmin) {
    return <Navigate to={APP_PATHS.home} replace />;
  }
  return <>{children}</>;
}
