import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router';

import { APP_PATHS } from '../../app/paths';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { auth, refresh } = useAuth();

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted text-sm">Checking session...</p>
      </div>
    );
  }
  if (auth.status === 'error') {
    return (
      <div className="glass-panel mx-auto mt-16 max-w-md p-8 text-center" role="alert">
        <h1 className="text-lg font-semibold">Could not verify your session</h1>
        <p className="text-muted mt-2 text-sm">
          The server did not answer. Retry, or sign in again if this keeps happening.
        </p>
        <button type="button" className="btn btn-accent mt-4" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }
  if (auth.status !== 'authenticated') {
    return <Navigate to={APP_PATHS.signIn} replace />;
  }
  if (requireAdmin && !auth.isAdmin) {
    return (
      <div className="glass-panel mx-auto mt-16 max-w-md p-8 text-center" role="alert">
        <h1 className="text-lg font-semibold">Admin access required</h1>
        <p className="text-muted mt-2 text-sm">Your account cannot open this page.</p>
        <Link to={APP_PATHS.home} className="btn btn-secondary mt-4 inline-flex">
          Go home
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
