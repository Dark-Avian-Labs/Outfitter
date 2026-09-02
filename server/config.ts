import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { config as loadEnv } from '@dotenvx/dotenvx';

import { isEncryptedEnvValue, normalizeClerkEnv } from './clerkEnv.js';

function resolveEnvFilePath(projectRoot: string): string | null {
  const normalizedNodeEnv = (process.env.NODE_ENV ?? '').trim().toLowerCase();

  if (normalizedNodeEnv === 'test') {
    const testPath = path.join(projectRoot, '.env.test');
    return fs.existsSync(testPath) ? testPath : null;
  }

  if (
    normalizedNodeEnv &&
    normalizedNodeEnv !== 'production' &&
    normalizedNodeEnv !== 'development'
  ) {
    throw new Error(
      `[FATAL] Unsupported NODE_ENV "${process.env.NODE_ENV}". Use production, development, or test.`,
    );
  }

  const isProduction = normalizedNodeEnv === 'production';
  const fileName = isProduction ? '.env.production' : '.env.development';
  const candidatePath = path.join(projectRoot, fileName);
  if (fs.existsSync(candidatePath)) {
    return candidatePath;
  }
  if (isProduction) {
    throw new Error(
      `[FATAL] Missing ${fileName}. Refusing to start production without the matching env file.`,
    );
  }
  return null;
}

const projectRoot = process.cwd();
const envKeysPath = path.join(projectRoot, '.env.keys');
if (fs.existsSync(envKeysPath)) {
  try {
    loadEnv({ path: envKeysPath, quiet: true });
  } catch (error) {
    console.error(`[Config] Failed to load environment keys from "${envKeysPath}".`, error);
    throw error;
  }
}

const envFilePath = resolveEnvFilePath(projectRoot);
if (envFilePath) {
  try {
    loadEnv({ path: envFilePath, quiet: true });
  } catch (error) {
    console.error(`[Config] Failed to load environment from "${envFilePath}".`, error);
    throw error;
  }
} else {
  console.debug(
    `[Config] No env file resolved (envFilePath is null); skipping loadEnv for cwd "${projectRoot}".`,
  );
}

normalizeClerkEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parentName = path.basename(path.resolve(__dirname, '..'));
export const PROJECT_ROOT = path.resolve(__dirname, parentName === 'dist' ? '../..' : '..');
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');

function resolveSessionDbPath(): string {
  const configured = process.env.SESSION_DB_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(PROJECT_ROOT, configured);
  }
  return path.join(DATA_DIR, 'sessions.db');
}

export const SESSION_DB_PATH = resolveSessionDbPath();

const _port = parseInt(process.env.PORT || '3004', 10);
export const PORT = Number.isFinite(_port) && _port > 0 ? _port : 3004;
const _shutdownTimeoutMs = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);
export const SHUTDOWN_TIMEOUT_MS =
  Number.isFinite(_shutdownTimeoutMs) && _shutdownTimeoutMs > 0 ? _shutdownTimeoutMs : 10_000;
export const HOST = process.env.HOST || '127.0.0.1';
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const APP_NAME = process.env.APP_NAME?.trim() || 'Outfitter';
const rawAppId = process.env.APP_ID?.trim() || '';
if (isEncryptedEnvValue(rawAppId)) {
  throw new Error(
    '[FATAL] APP_ID is still encrypted. Ensure DOTENV_PRIVATE_KEY_* is available (see .env.keys) or run via dotenvx.',
  );
}
export const APP_ID = rawAppId || 'outfitter';

function readPackageVersion(projectRoot: string): string {
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg: unknown = JSON.parse(raw);
    if (!pkg || typeof pkg !== 'object' || !('version' in pkg)) {
      return '0.0.0';
    }
    const version = pkg.version;
    if (typeof version !== 'string') {
      return '0.0.0';
    }
    const v = version.trim();
    return v.length > 0 ? v : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readPackageVersion(PROJECT_ROOT);

const DEFAULT_SESSION_SECRET = 'outfitter-dev-only-secret-change-me-32';
const envSessionSecret = process.env.SESSION_SECRET?.trim() || '';
if (isEncryptedEnvValue(envSessionSecret)) {
  throw new Error(
    '[FATAL] SESSION_SECRET is still encrypted. Ensure DOTENV_PRIVATE_KEY_* is available (see .env.keys) or run via dotenvx.',
  );
}
if (NODE_ENV === 'production' && envSessionSecret.length < 32) {
  throw new Error('[FATAL] SESSION_SECRET must be set and at least 32 characters in production.');
}
export const SESSION_SECRET = envSessionSecret || DEFAULT_SESSION_SECRET;

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

export const TRUST_PROXY = parseBooleanEnv(process.env.TRUST_PROXY) ?? false;
export const SECURE_COOKIES =
  parseBooleanEnv(process.env.SECURE_COOKIES) ?? NODE_ENV === 'production';
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined;
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME?.trim() || `${APP_ID}.sid`;
export const APP_PUBLIC_BASE_URL = process.env.APP_PUBLIC_BASE_URL?.trim() || '';
export const LEGAL_PAGE_URL =
  process.env.LEGAL_PAGE_URL?.trim() || 'https://darkavianlabs.com/legal/';

function resolveProjectPath(configured: string | undefined, fallbackRelative: string): string {
  const value = configured?.trim();
  if (value) {
    return path.isAbsolute(value) ? value : path.resolve(PROJECT_ROOT, value);
  }
  return path.resolve(PROJECT_ROOT, fallbackRelative);
}

export const APP_DB_PATH = resolveProjectPath(
  process.env.APP_DB_PATH,
  path.join('data', 'outfitter.db'),
);
export const HERO_IMAGES_DIR = resolveProjectPath(
  process.env.HERO_IMAGES_DIR,
  path.join('data', 'hero-images'),
);
export const CODEX_WOR_DB_PATH = resolveProjectPath(
  process.env.CODEX_WOR_DB_PATH,
  path.join('..', 'Codex', 'data', 'wor.db'),
);
export const CODEX_WOR_IMAGES_DIR = resolveProjectPath(
  process.env.CODEX_WOR_IMAGES_DIR,
  path.join('..', 'Codex', 'data', 'wor-images'),
);

export function ensureDataDirs(): void {
  for (const dir of [
    DATA_DIR,
    path.dirname(SESSION_DB_PATH),
    path.dirname(APP_DB_PATH),
    HERO_IMAGES_DIR,
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
