import { Link } from 'react-router';

import { APP_DISPLAY_NAME } from '../../app/config';
import { APP_PATHS } from '../../app/paths';
import { buildAuthPagePath } from './authRedirect';

export function AccountRequired({ returnTo }: { returnTo: string }) {
  const signInPath = buildAuthPagePath(APP_PATHS.signIn, returnTo);
  const signUpPath = buildAuthPagePath(APP_PATHS.signUp, returnTo);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
      <div className="glass-panel w-full p-8">
        <h1 className="text-foreground mb-3 text-2xl font-semibold tracking-tight">
          Sign in to use {APP_DISPLAY_NAME}
        </h1>
        <p className="text-muted mb-6 text-sm leading-relaxed">
          A Dark Avian Labs account is required for this page.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={signUpPath} className="btn btn-accent w-full sm:w-auto">
            Create account
          </Link>
          <Link to={signInPath} className="btn btn-secondary w-full sm:w-auto">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
