import { buildClerkProfileAppearance } from '@/clerk';
import { Show, UserButton } from '@clerk/react';
import { Link } from 'react-router';

import { APP_PATHS } from '../../app/paths';
import { useTheme } from '../../context/ThemeContext';

export function AuthControls() {
  const { mode } = useTheme();

  return (
    <>
      <Show when="signed-out">
        <Link to={APP_PATHS.signIn} className="header-link">
          Sign in
        </Link>
      </Show>
      <Show when="signed-in">
        <UserButton appearance={buildClerkProfileAppearance(mode)} />
      </Show>
    </>
  );
}
