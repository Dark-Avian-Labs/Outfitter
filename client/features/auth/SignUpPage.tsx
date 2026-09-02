import { buildClerkAppearance, ClerkAuthShell } from '@/clerk';
import { SignUp } from '@clerk/react';
import { Navigate } from 'react-router';

import { APP_DISPLAY_NAME, CLERK_ENABLED } from '../../app/config';
import { APP_PATHS } from '../../app/paths';
import { useTheme } from '../../context/ThemeContext';

export function SignUpPage() {
  const { mode } = useTheme();

  if (!CLERK_ENABLED) {
    return <Navigate to={APP_PATHS.home} replace />;
  }

  return (
    <ClerkAuthShell title="Create account" subtitle={`Join ${APP_DISPLAY_NAME}.`}>
      <SignUp
        routing="path"
        path={APP_PATHS.signUp}
        signInUrl={APP_PATHS.signIn}
        fallbackRedirectUrl={APP_PATHS.home}
        appearance={buildClerkAppearance(mode)}
      />
    </ClerkAuthShell>
  );
}
