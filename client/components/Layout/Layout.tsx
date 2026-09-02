import { buildClerkProfileAppearance } from '@/clerk';
import { useClerk } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router';

import feathers from '../../../assets/feathers.png';
import {
  APP_DISPLAY_NAME,
  APP_VERSION,
  CLERK_ENABLED,
  LEGAL_ENTITY_NAME,
  LEGAL_PAGE_URL,
} from '../../app/config';
import { APP_PATHS } from '../../app/paths';
import { MaterialSymbol } from '../../components/ui/MaterialSymbol';
import { Menu } from '../../components/ui/Menu';
import { UiStyleSelector } from '../../components/ui/UiStyleSelector';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../features/auth/AuthContext';
import { AsciiWaveBackground } from './AsciiWaveBackground';
import { HexSideBackground } from './HexSideBackground';
import { StaleClientUpdateBanner } from './StaleClientUpdateBanner';

function ClerkUserMenuItems({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const { mode } = useTheme();
  const { auth } = useAuth();
  const clerk = useClerk();
  const isLoggedIn = auth.status === 'authenticated';

  if (!isLoggedIn) {
    return (
      <>
        <Link to={APP_PATHS.signIn} className="user-menu-item" role="menuitem" onClick={onClose}>
          Sign in
        </Link>
        <div className="user-menu-divider" role="separator" />
        <UiStyleSelector />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="user-menu-item text-left"
        role="menuitem"
        onClick={() => {
          onClose();
          clerk.openUserProfile({
            appearance: buildClerkProfileAppearance(mode),
          });
        }}
      >
        Profile
      </button>
      <div className="user-menu-divider" role="separator" />
      <UiStyleSelector />
      {isAdmin ? (
        <Link to={APP_PATHS.admin} className="user-menu-item" role="menuitem" onClick={onClose}>
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        className="user-menu-item text-left"
        role="menuitem"
        onClick={() => {
          onClose();
          void clerk.signOut({ redirectUrl: APP_PATHS.home });
        }}
      >
        Logout
      </button>
    </>
  );
}

export function Layout() {
  const { mode, toggleMode } = useTheme();
  const { auth } = useAuth();
  const currentYear = new Date().getFullYear();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const userMenuId = 'outfitter-user-menu';
  const isAdmin = auth.status === 'authenticated' && auth.isAdmin;

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <HexSideBackground />
      <AsciiWaveBackground />
      <header className="relative z-30 h-[100px] px-6">
        <div className="mx-auto grid h-full w-full max-w-[2000px] grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link to={APP_PATHS.home} className="brand-lockup w-fit">
            <img src={feathers} alt="Dark Avian Labs feather mark" className="brand-lockup__icon" />
            <span className="brand-lockup__title brand-lockup--fx">{APP_DISPLAY_NAME}</span>
          </Link>

          <div className="justify-self-center" />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="icon-toggle-btn"
              onClick={toggleMode}
              aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
            >
              {mode === 'dark' ? (
                <MaterialSymbol name="light_mode" filled />
              ) : (
                <MaterialSymbol name="dark_mode" filled />
              )}
            </button>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="icon-toggle-btn"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-controls={userMenuOpen ? userMenuId : undefined}
                aria-label="Open user menu"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <MaterialSymbol name="person" filled />
              </button>
              {userMenuOpen ? (
                <Menu>
                  <div id={userMenuId} role="menu" aria-orientation="vertical">
                    {CLERK_ENABLED ? (
                      <ClerkUserMenuItems
                        isAdmin={isAdmin}
                        onClose={() => setUserMenuOpen(false)}
                      />
                    ) : (
                      <UiStyleSelector />
                    )}
                  </div>
                </Menu>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      <main className="relative z-0 flex-1 px-6 pb-6">
        <div className="mx-auto w-full max-w-[2000px]">
          <Outlet />
        </div>
      </main>
      <footer className="relative z-10 flex h-[50px] items-center justify-center px-6">
        <div className="mx-auto w-full max-w-[2000px] text-center">
          <a
            href={LEGAL_PAGE_URL}
            className="text-muted hover:text-foreground text-sm"
            target={LEGAL_PAGE_URL.startsWith('http') ? '_blank' : undefined}
            rel={LEGAL_PAGE_URL.startsWith('http') ? 'noreferrer' : undefined}
          >
            ©{currentYear} {LEGAL_ENTITY_NAME}
          </a>
        </div>
      </footer>
      <StaleClientUpdateBanner appVersion={APP_VERSION} />
    </div>
  );
}
