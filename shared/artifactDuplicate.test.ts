import { describe, expect, it } from 'vitest';

import { artifactIdentityKey, findDuplicateArtifact, identityFromArtifact } from './artifactDuplicate.js';

const scarab = {
  catalog_slug: 'golden-scarab',
  level: 25,
  promotion: 5,
  hp_base: 4650,
  hp_bonus: 2520,
  atk_base: 1497,
  atk_bonus: 335,
  secondary_stat: 'atkSpd',
  secondary_value: 49,
};

describe('artifactIdentityKey', () => {
  it('treats missing secondary as the same as empty', () => {
    const withNone = artifactIdentityKey(
      identityFromArtifact({ ...scarab, secondary_stat: null, secondary_value: null }),
    );
    const withEmpty = artifactIdentityKey(identityFromArtifact({ ...scarab, secondary_stat: '', secondary_value: 0 }));
    expect(withNone).toBe(withEmpty);
  });

  it('treats a different catalog or roll as a different piece', () => {
    expect(artifactIdentityKey(identityFromArtifact({ ...scarab, catalog_slug: 'auditore-blade' }))).not.toBe(
      artifactIdentityKey(identityFromArtifact(scarab)),
    );
    expect(artifactIdentityKey(identityFromArtifact({ ...scarab, atk_bonus: 336 }))).not.toBe(
      artifactIdentityKey(identityFromArtifact(scarab)),
    );
  });
});

describe('findDuplicateArtifact', () => {
  const stash = [{ id: 1, ...scarab }];

  it('finds an exact name and stats match', () => {
    expect(findDuplicateArtifact(stash, identityFromArtifact(scarab))?.id).toBe(1);
  });

  it('ignores the piece being edited', () => {
    expect(findDuplicateArtifact(stash, identityFromArtifact(scarab), 1)).toBeUndefined();
  });
});
