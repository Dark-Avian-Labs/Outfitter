import { ClerkProvider } from '@clerk/react';

import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from './app/config';
import { APP_PATHS } from './app/paths';
import { AppRoutes } from './app/routes';
import { AuthProvider, DisabledAuthProvider } from './features/auth/AuthContext';

export function App() {
  if (!CLERK_ENABLED) {
    return (
      <DisabledAuthProvider>
        <AppRoutes />
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
        <AppRoutes />
      </AuthProvider>
    </ClerkProvider>
  );
}
