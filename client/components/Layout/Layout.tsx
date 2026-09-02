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
import { AuthControls } from '../../features/auth/AuthControls';
import { AsciiWaveBackground } from './AsciiWaveBackground';
import { HexSideBackground } from './HexSideBackground';
import { StaleClientUpdateBanner } from './StaleClientUpdateBanner';

export function Layout() {
  const { mode, toggleMode } = useTheme();
  const { auth } = useAuth();
  const currentYear = new Date().getFullYear();
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = auth.status === 'authenticated' && auth.isAdmin;

  useEffect(() => {
    if (!settingsMenuOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [settingsMenuOpen]);

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
            {CLERK_ENABLED && <AuthControls />}
            <button
              type="button"
              className="icon-toggle-btn"
              onClick={toggleMode}
              aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span aria-hidden="true">{mode === 'dark' ? '☀' : '☾'}</span>
            </button>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="icon-toggle-btn"
                aria-expanded={settingsMenuOpen}
                aria-controls="settings-menu"
                aria-label="Open settings menu"
                onClick={() => setSettingsMenuOpen((prev) => !prev)}
              >
                <MaterialSymbol name="settings" />
              </button>
              {settingsMenuOpen && (
                <Menu id="settings-menu">
                  {isAdmin ? (
                    <>
                      <Link
                        to={APP_PATHS.admin}
                        className="user-menu-item"
                        onClick={() => setSettingsMenuOpen(false)}
                      >
                        Admin
                      </Link>
                      <div className="user-menu-divider" role="separator" />
                    </>
                  ) : null}
                  <UiStyleSelector />
                </Menu>
              )}
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
