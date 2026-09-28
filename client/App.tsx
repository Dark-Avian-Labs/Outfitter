import { ClerkProvider } from '@clerk/react';
import { Outlet } from 'react-router';

import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from './app/config';
import { APP_PATHS } from './app/paths';
import { AuthProvider, DisabledAuthProvider } from './features/auth/AuthContext';

export function App() {
  if (!CLERK_ENABLED) {
    return (
      <DisabledAuthProvider>
        <Outlet />
      </DisabledAuthProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={APP_PATHS.signIn}
      signUpUrl={APP_PATHS.signUp}
      afterSignOutUrl={APP_PATHS.home}
    >
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ClerkProvider>
  );
}
