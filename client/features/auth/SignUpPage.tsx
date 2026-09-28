import { buildClerkAppearance, ClerkAuthShell } from '@/clerk';
import { SignUp } from '@clerk/react';
import { Navigate, useSearchParams } from 'react-router';

import { APP_DISPLAY_NAME, CLERK_ENABLED } from '../../app/config';
import { APP_PATHS } from '../../app/paths';
import { useTheme } from '../../context/ThemeContext';
import { buildAuthPagePath, getAuthRedirectUrl } from './authRedirect';

export function SignUpPage() {
  const { mode } = useTheme();
  const [searchParams] = useSearchParams();
  const redirectUrl = getAuthRedirectUrl(searchParams, APP_PATHS.home);

  if (!CLERK_ENABLED) {
    return <Navigate to={APP_PATHS.home} replace />;
  }

  return (
    <ClerkAuthShell title="Create account" subtitle={`Join ${APP_DISPLAY_NAME}.`}>
      <SignUp
        routing="path"
        path={APP_PATHS.signUp}
        signInUrl={buildAuthPagePath(APP_PATHS.signIn, redirectUrl)}
        fallbackRedirectUrl={redirectUrl}
        appearance={buildClerkAppearance(mode)}
      />
    </ClerkAuthShell>
  );
}
