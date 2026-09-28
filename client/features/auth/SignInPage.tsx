import { buildClerkAppearance, ClerkAuthShell } from '@/clerk';
import { SignIn } from '@clerk/react';
import { Navigate, useSearchParams } from 'react-router';

import { CLERK_ENABLED } from '../../app/config';
import { APP_PATHS } from '../../app/paths';
import { useTheme } from '../../context/ThemeContext';
import { buildAuthPagePath, getAuthRedirectUrl } from './authRedirect';

export function SignInPage() {
  const { mode } = useTheme();
  const [searchParams] = useSearchParams();
  const redirectUrl = getAuthRedirectUrl(searchParams, APP_PATHS.home);

  if (!CLERK_ENABLED) {
    return <Navigate to={APP_PATHS.home} replace />;
  }

  return (
    <ClerkAuthShell title="Sign in" subtitle="Use your Dark Avian Labs account.">
      <SignIn
        routing="path"
        path={APP_PATHS.signIn}
        signUpUrl={buildAuthPagePath(APP_PATHS.signUp, redirectUrl)}
        fallbackRedirectUrl={redirectUrl}
        appearance={buildClerkAppearance(mode)}
      />
    </ClerkAuthShell>
  );
}
