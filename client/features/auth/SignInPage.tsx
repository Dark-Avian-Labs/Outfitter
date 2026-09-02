import { buildClerkAppearance, ClerkAuthShell } from '@/clerk';
import { SignIn } from '@clerk/react';
import { Navigate } from 'react-router';

import { CLERK_ENABLED } from '../../app/config';
import { APP_PATHS } from '../../app/paths';
import { useTheme } from '../../context/ThemeContext';

export function SignInPage() {
  const { mode } = useTheme();

  if (!CLERK_ENABLED) {
    return <Navigate to={APP_PATHS.home} replace />;
  }

  return (
    <ClerkAuthShell title="Sign in" subtitle="Use your Dark Avian Labs account.">
      <SignIn
        routing="path"
        path={APP_PATHS.signIn}
        signUpUrl={APP_PATHS.signUp}
        fallbackRedirectUrl={APP_PATHS.home}
        appearance={buildClerkAppearance(mode)}
      />
    </ClerkAuthShell>
  );
}
