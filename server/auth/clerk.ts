export const APP_ADMIN_ROLE = 'admin' as const;

export type AppMetadata = {
  apps?: Record<string, string>;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return value as Record<string, unknown>;
}

function normalizeApps(apps: unknown): Record<string, string> | undefined {
  const record = asRecord(apps);
  if (!record) return undefined;
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') normalized[key] = value;
  }
  return normalized;
}

export function isAppAdmin(metadata: AppMetadata | undefined | null, appId: string): boolean {
  const apps = metadata?.apps;
  if (!apps) return false;
  const wanted = appId.toLowerCase();
  for (const [key, value] of Object.entries(apps)) {
    if (key.toLowerCase() === wanted && value === APP_ADMIN_ROLE) return true;
  }
  return false;
}

export function metadataFromSessionClaims(sessionClaims: unknown): AppMetadata | undefined {
  const claims = asRecord(sessionClaims);
  if (!claims) return undefined;
  const metadata =
    asRecord(claims.metadata) ??
    asRecord(claims.public_metadata) ??
    asRecord(claims.publicMetadata);
  if (!metadata) return undefined;
  return { apps: normalizeApps(metadata.apps) };
}
