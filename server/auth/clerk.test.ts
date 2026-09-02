import { describe, expect, it } from 'vitest';

import { isAppAdmin, metadataFromSessionClaims } from './clerk.js';

describe('metadataFromSessionClaims', () => {
  it('reads apps from the metadata claim', () => {
    const metadata = metadataFromSessionClaims({
      metadata: { apps: { outfitter: 'admin', codex: 'user' } },
    });
    expect(metadata?.apps).toEqual({ outfitter: 'admin', codex: 'user' });
  });

  it('falls back to public_metadata when metadata is missing', () => {
    const metadata = metadataFromSessionClaims({
      public_metadata: { apps: { Outfitter: 'admin' } },
    });
    expect(isAppAdmin(metadata, 'outfitter')).toBe(true);
  });

  it('falls back to publicMetadata camelCase', () => {
    const metadata = metadataFromSessionClaims({
      publicMetadata: { apps: { outfitter: 'admin' } },
    });
    expect(isAppAdmin(metadata, 'outfitter')).toBe(true);
  });
});

describe('isAppAdmin', () => {
  it('matches app ids case-insensitively', () => {
    expect(isAppAdmin({ apps: { Outfitter: 'admin' } }, 'outfitter')).toBe(true);
    expect(isAppAdmin({ apps: { outfitter: 'admin' } }, 'OUTFITTER')).toBe(true);
    expect(isAppAdmin({ apps: { outfitter: 'user' } }, 'outfitter')).toBe(false);
  });
});
