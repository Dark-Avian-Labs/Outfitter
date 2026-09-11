export const GEAR_SLOTS = ['weapon', 'armor', 'bangle', 'amulet', 'ring'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

export const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  bangle: 'Bangle',
  amulet: 'Amulet',
  ring: 'Ring',
};

export const GEAR_PREFIXES = ['none', 'ancient', 'variant'] as const;
export type GearPrefix = (typeof GEAR_PREFIXES)[number];

export const GEAR_STAT_KEYS = [
  'hp',
  'def',
  'atk',
  'rageRegen',
  'critRate',
  'critDmg',
  'atkSpd',
  'healingEffect',
  'atkBonus',
  'defBonus',
  'hpBonus',
] as const;
export type GearStatKey = (typeof GEAR_STAT_KEYS)[number];

export const GEAR_STAT_LABELS: Record<GearStatKey, string> = {
  hp: 'HP',
  def: 'DEF',
  atk: 'ATK',
  rageRegen: 'Rage Regen',
  critRate: 'Crit Rate',
  critDmg: 'Crit Damage',
  atkSpd: 'ATK Speed',
  healingEffect: 'Healing Effect',
  atkBonus: 'ATK Bonus',
  defBonus: 'DEF Bonus',
  hpBonus: 'HP Bonus',
};

export const PERCENT_STATS = new Set<GearStatKey>([
  'rageRegen',
  'critRate',
  'critDmg',
  'atkBonus',
  'defBonus',
  'hpBonus',
]);

export const SUBSTAT_RANGE: Record<GearStatKey, { min: number; max: number }> = {
  hp: { min: 275, max: 3025 },
  def: { min: 32, max: 357 },
  atk: { min: 60, max: 660 },
  rageRegen: { min: 3, max: 33 },
  critRate: { min: 3, max: 33 },
  critDmg: { min: 4, max: 44 },
  atkSpd: { min: 10, max: 110 },
  healingEffect: { min: 3, max: 33 },
  atkBonus: { min: 3, max: 33 },
  defBonus: { min: 3, max: 33 },
  hpBonus: { min: 3, max: 33 },
};

export const MAIN_STAT_BONUS_MAX: Record<GearStatKey, number> = {
  atk: 85,
  hp: 360,
  def: 36,
  atkBonus: 5,
  defBonus: 5,
  hpBonus: 5,
  rageRegen: 5,
  critRate: 5,
  critDmg: 6,
  healingEffect: 5,
  atkSpd: 18,
};

export const MAIN_STAT_VALUE_MAX: Record<GearStatKey, number> = {
  hp: 3960,
  atk: 1141,
  def: 720,
  rageRegen: 71,
  critRate: 71,
  critDmg: 78,
  atkSpd: 238,
  healingEffect: 71,
  atkBonus: 71,
  defBonus: 71,
  hpBonus: 71,
};

export const SLOT_MAIN_STATS: Record<GearSlot, readonly GearStatKey[]> = {
  weapon: ['atk'],
  armor: ['hp'],
  bangle: [
    'atk',
    'def',
    'hp',
    'atkBonus',
    'defBonus',
    'hpBonus',
    'critRate',
    'critDmg',
    'healingEffect',
  ],
  amulet: [
    'atk',
    'def',
    'hp',
    'atkBonus',
    'defBonus',
    'hpBonus',
    'critDmg',
    'healingEffect',
    'atkSpd',
  ],
  ring: [
    'atk',
    'def',
    'hp',
    'atkBonus',
    'defBonus',
    'hpBonus',
    'rageRegen',
    'critDmg',
    'healingEffect',
  ],
};

export const HERO_CLASSES = [
  'fighter',
  'mage',
  'marksman',
  'defender',
  'healer',
  'tactician',
] as const;
export type HeroClassKey = (typeof HERO_CLASSES)[number];

export const CLASS_DISPLAY_NAMES: Record<HeroClassKey, string> = {
  fighter: 'Fighter',
  mage: 'Mage',
  marksman: 'Marksman',
  defender: 'Defender',
  healer: 'Healer',
  tactician: 'Tactician',
};

export const FACTIONS = [
  'watchguard',
  'north_throne',
  'nightmare_council',
  'cursed_cult',
  'infernal_blast',
  'star_piercers',
  'esoteria_order',
  'chaos_dominion',
  'supreme_arbiters',
  'unnamable',
  'unaffiliated',
] as const;
export type FactionKey = (typeof FACTIONS)[number];

export const FACTION_DISPLAY_NAMES: Record<FactionKey, string> = {
  watchguard: 'Watchguard',
  north_throne: 'North Throne',
  nightmare_council: 'Nightmare Council',
  cursed_cult: 'Cursed Cult',
  infernal_blast: 'Infernal Blast',
  star_piercers: 'Star Piercers',
  esoteria_order: 'Esoteria Order',
  chaos_dominion: 'Chaos Dominion',
  supreme_arbiters: 'Supreme Arbiters',
  unnamable: 'Unnamable',
  unaffiliated: 'Unaffiliated',
};

export const FILTER_STAR_RATINGS = [3, 4, 5] as const;
export const FILTER_STAR_RARITY_LABELS: Record<3 | 4 | 5 | 6, string> = {
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
  6: 'Mythic',
};

export const ARTIFACT_LEVEL_MIN = 1;
export const ARTIFACT_LEVEL_MAX = 25;
export const ARTIFACT_PROMOTION_MAX = 5;
export const ARTIFACT_PROMOTION_MAX_LEVEL = [10, 13, 16, 19, 22, 25] as const;

export const ARTIFACT_SECONDARY_STATS = [
  'atkBonus',
  'defBonus',
  'hpBonus',
  'rageRegen',
  'critRate',
  'critDmg',
  'healingEffect',
  'atkSpd',
] as const;
export type ArtifactSecondaryStat = (typeof ARTIFACT_SECONDARY_STATS)[number];

export const ARTIFACT_SECONDARY_RANGE: Record<ArtifactSecondaryStat, { min: number; max: number }> =
  {
    atkBonus: { min: 3, max: 15 },
    defBonus: { min: 3, max: 15 },
    hpBonus: { min: 3, max: 15 },
    rageRegen: { min: 3, max: 15 },
    critRate: { min: 3, max: 15 },
    critDmg: { min: 3, max: 15 },
    healingEffect: { min: 3, max: 15 },
    atkSpd: { min: 10, max: 50 },
  };

export function isArtifactSecondaryStat(value: string): value is ArtifactSecondaryStat {
  return (ARTIFACT_SECONDARY_STATS as readonly string[]).includes(value);
}

export function promotionFromMaxLevel(maxLevel: number): number {
  if (maxLevel <= 10) return 0;
  if (maxLevel <= 13) return 1;
  if (maxLevel <= 16) return 2;
  if (maxLevel <= 19) return 3;
  if (maxLevel <= 22) return 4;
  return ARTIFACT_PROMOTION_MAX;
}

export function maxLevelForPromotion(promotion: number): number {
  const index = Math.max(0, Math.min(ARTIFACT_PROMOTION_MAX, Math.trunc(promotion)));
  return ARTIFACT_PROMOTION_MAX_LEVEL[index] ?? ARTIFACT_LEVEL_MAX;
}

export function formatStatValue(stat: GearStatKey, value: number): string {
  if (PERCENT_STATS.has(stat)) return `${trimNumber(value)}%`;
  return trimNumber(value);
}

export function trimNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10) / 10);
}

export function gaugeRatio(stat: GearStatKey, value: number): number {
  const max = SUBSTAT_RANGE[stat].max;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

export function isSubstatInRange(stat: GearStatKey, value: number): boolean {
  const range = SUBSTAT_RANGE[stat];
  return value >= range.min && value <= range.max;
}

type GearRangeFields = {
  main_stat: GearStatKey;
  main_value?: number;
  main_bonus: number;
  sub1_stat: GearStatKey | null;
  sub1_value: number | null;
  sub2_stat: GearStatKey | null;
  sub2_value: number | null;
  sub3_stat: GearStatKey | null;
  sub3_value: number | null;
  sub4_stat: GearStatKey | null;
  sub4_value: number | null;
};

export function outOfRangeGearLabels(piece: GearRangeFields): string[] {
  const labels: string[] = [];
  if (piece.main_value != null && piece.main_value > MAIN_STAT_VALUE_MAX[piece.main_stat]) {
    labels.push(GEAR_STAT_LABELS[piece.main_stat]);
  }
  const bonusMax = MAIN_STAT_BONUS_MAX[piece.main_stat] ?? 0;
  if (piece.main_bonus < 0 || piece.main_bonus > bonusMax) {
    labels.push(`${GEAR_STAT_LABELS[piece.main_stat]} bonus`);
  }
  const subs = [
    { stat: piece.sub1_stat, value: piece.sub1_value },
    { stat: piece.sub2_stat, value: piece.sub2_value },
    { stat: piece.sub3_stat, value: piece.sub3_value },
    { stat: piece.sub4_stat, value: piece.sub4_value },
  ];
  for (const entry of subs) {
    if (entry.stat == null || entry.value == null) continue;
    if (!isSubstatInRange(entry.stat, entry.value)) labels.push(GEAR_STAT_LABELS[entry.stat]);
  }
  return labels;
}

export function gearHasOutOfRangeStats(piece: GearRangeFields): boolean {
  return outOfRangeGearLabels(piece).length > 0;
}

export function gaugeColor(ratio: number): string {
  const pct = ratio * 100;
  if (pct >= 100) return 'var(--color-rarity-red)';
  if (pct >= 80) return 'var(--color-rarity-gold)';
  if (pct >= 60) return 'var(--color-rarity-purple)';
  if (pct >= 40) return 'var(--color-rarity-blue)';
  if (pct >= 20) return 'var(--color-rarity-green)';
  return 'var(--color-rarity-gray)';
}

export function gearSetBadgeSrc(setKey: string): string {
  return `/gear/sets/${setKey}.webp`;
}

export function gearPieceArtSrc(setKey: string, slot: GearSlot): string {
  return `/gear/pieces/${setKey}-${slot}.webp`;
}

export function gearEmptySlotSrc(slot: GearSlot): string {
  return `/gear/slots/${slot}.webp`;
}
