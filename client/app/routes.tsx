import { lazy } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router';

import { App } from '../App';
import { Layout } from '../components/Layout/Layout';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { NotFoundPage } from '../features/not-found/NotFoundPage';
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

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      }
    >
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>,
  ),
);
