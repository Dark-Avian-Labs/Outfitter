export type ArtifactIdentity = {
  catalog_slug: string;
  level: number;
  promotion: number;
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: string;
  secondary_value: number;
};

export type ArtifactIdentitySource = {
  id?: number;
  catalog_slug: string;
  level: number;
  promotion: number;
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: string | null;
  secondary_value: number | null;
};

export function identityFromArtifact(row: ArtifactIdentitySource): ArtifactIdentity {
  const stat = row.secondary_stat?.trim() ?? '';
  return {
    catalog_slug: row.catalog_slug,
    level: Number(row.level),
    promotion: Number(row.promotion),
    hp_base: Number(row.hp_base),
    hp_bonus: Number(row.hp_bonus),
    atk_base: Number(row.atk_base),
    atk_bonus: Number(row.atk_bonus),
    secondary_stat: stat,
    secondary_value: stat ? Number(row.secondary_value ?? 0) : 0,
  };
}

export function artifactIdentityKey(piece: ArtifactIdentity): string {
  const secondary = piece.secondary_stat
    ? `${piece.secondary_stat}:${Number(piece.secondary_value)}`
    : '';
  return [
    piece.catalog_slug,
    Number(piece.level),
    Number(piece.promotion),
    Number(piece.hp_base),
    Number(piece.hp_bonus),
    Number(piece.atk_base),
    Number(piece.atk_bonus),
    secondary,
  ].join('|');
}

export function findDuplicateArtifact<T extends ArtifactIdentitySource>(
  stash: T[],
  candidate: ArtifactIdentity,
  ignoreId?: number,
): T | undefined {
  const wanted = artifactIdentityKey(candidate);
  return stash.find((piece) => {
    if (ignoreId != null && piece.id === ignoreId) return false;
    return artifactIdentityKey(identityFromArtifact(piece)) === wanted;
  });
}
