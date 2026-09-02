import type { GearStatKey } from './catalog.js';

export type GearIdentity = {
  slot: string;
  set_key: string;
  main_stat: string;
  main_value: number;
  main_bonus: number;
  substats: { stat: string; value: number }[];
};

export type GearIdentitySource = {
  id?: number;
  slot: string;
  set_key: string;
  main_stat: string;
  main_value: number;
  main_bonus: number;
  substats?: { stat: GearStatKey | string; value: number }[];
  sub1_stat?: string | null;
  sub1_value?: number | null;
  sub2_stat?: string | null;
  sub2_value?: number | null;
  sub3_stat?: string | null;
  sub3_value?: number | null;
  sub4_stat?: string | null;
  sub4_value?: number | null;
};

function substatsFromRow(row: GearIdentitySource): { stat: string; value: number }[] {
  return [
    { stat: row.sub1_stat, value: row.sub1_value },
    { stat: row.sub2_stat, value: row.sub2_value },
    { stat: row.sub3_stat, value: row.sub3_value },
    { stat: row.sub4_stat, value: row.sub4_value },
  ]
    .filter(
      (entry): entry is { stat: string; value: number } =>
        typeof entry.stat === 'string' && typeof entry.value === 'number' && entry.value > 0,
    )
    .map((entry) => ({ stat: entry.stat, value: entry.value }));
}

export function identityFromGearRow(row: GearIdentitySource): GearIdentity {
  return {
    slot: row.slot,
    set_key: row.set_key,
    main_stat: row.main_stat,
    main_value: row.main_value,
    main_bonus: row.main_bonus,
    substats: row.substats ? row.substats.filter((entry) => entry.value > 0) : substatsFromRow(row),
  };
}

export function gearIdentityKey(piece: GearIdentity): string {
  const subs = piece.substats
    .filter((entry) => entry.value > 0)
    .map((entry) => `${entry.stat}:${Number(entry.value)}`)
    .sort()
    .join(',');
  return [
    piece.slot,
    piece.set_key,
    piece.main_stat,
    Number(piece.main_value),
    Number(piece.main_bonus),
    subs,
  ].join('|');
}

export function findDuplicateGear<T extends GearIdentitySource>(
  stash: T[],
  candidate: GearIdentity,
  ignoreId?: number,
): T | undefined {
  const wanted = gearIdentityKey(candidate);
  return stash.find((piece) => {
    if (ignoreId != null && piece.id === ignoreId) return false;
    return gearIdentityKey(identityFromGearRow(piece)) === wanted;
  });
}
