const DEV_AUTHORIZED_PARTIES = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3003',
  'http://localhost:3004',
  'http://127.0.0.1:3004',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
] as const;

function normalizeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string, isDevEnv: boolean): boolean {
  return origin.startsWith('https://') || (isDevEnv && origin.startsWith('http://'));
}

function isDevEnvironment(): boolean {
  return (process.env.NODE_ENV ?? '').trim().toLowerCase() !== 'production';
}

function collectConfiguredOrigins(appOrigin: string | null): string[] {
  const isDevEnv = isDevEnvironment();
  const configuredOrigins = (process.env.ALLOWED_APP_ORIGINS ?? '')
    .split(',')
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));
  const origins = [appOrigin, ...configuredOrigins, ...(isDevEnv ? DEV_AUTHORIZED_PARTIES : [])];
  return [...new Set(origins.filter((origin): origin is string => Boolean(origin)))].filter(
    (origin) => isAllowedOrigin(origin, isDevEnv),
  );
}

export function isSameHostOrigin(hostHeader: string | undefined, origin: string): boolean {
  try {
    const parsedOrigin = new URL(origin);
    if (typeof hostHeader !== 'string' || hostHeader.length === 0) {
      return false;
    }
    return parsedOrigin.host === hostHeader;
  } catch {
    return false;
  }
}

export function isAllowedMutatingOrigin(origin: string, hostHeader: string | undefined): boolean {
  if (isSameHostOrigin(hostHeader, origin)) {
    return true;
  }
  const appOrigin = normalizeOrigin(process.env.APP_PUBLIC_BASE_URL?.trim() ?? '');
  return collectConfiguredOrigins(appOrigin).includes(origin);
}

export function getClerkAuthorizedParties(): string[] {
  const nodeEnv = (process.env.NODE_ENV ?? '').trim().toLowerCase();
  const isDevEnv = nodeEnv !== 'production';

  const appPublicBaseUrl = process.env.APP_PUBLIC_BASE_URL?.trim();
  if (!appPublicBaseUrl) {
    throw new Error('APP_PUBLIC_BASE_URL must be set when Clerk is configured.');
  }

  const appOrigin = normalizeOrigin(appPublicBaseUrl);
  if (!appOrigin || !isAllowedOrigin(appOrigin, isDevEnv)) {
    throw new Error(
      `APP_PUBLIC_BASE_URL (${appPublicBaseUrl}) is not an allowed origin for NODE_ENV=${nodeEnv || '(unset)'}. Use https:// in production.`,
    );
  }

  return collectConfiguredOrigins(appOrigin);
}
