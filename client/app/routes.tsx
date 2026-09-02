import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';

import { Layout } from '../components/Layout/Layout';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { APP_PATHS } from './paths';

const OutfitterPage = lazy(() =>
  import('../features/outfitter/OutfitterPage').then((mod) => ({
    default: mod.OutfitterPage,
  })),
);
const AdminPage = lazy(() =>
  import('../features/admin/AdminPage').then((mod) => ({
    default: mod.AdminPage,
  })),
);
const SignInPage = lazy(() =>
  import('../features/auth/SignInPage').then((mod) => ({
    default: mod.SignInPage,
  })),
);
const SignUpPage = lazy(() =>
  import('../features/auth/SignUpPage').then((mod) => ({
    default: mod.SignUpPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted text-sm">Loading...</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path={APP_PATHS.home}
              element={
                <ProtectedRoute>
                  <OutfitterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={APP_PATHS.admin}
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            {/* Clerk path routing needs the wildcard for multi-step flows. */}
            <Route path={`${APP_PATHS.signIn}/*`} element={<SignInPage />} />
            <Route path={`${APP_PATHS.signUp}/*`} element={<SignUpPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
