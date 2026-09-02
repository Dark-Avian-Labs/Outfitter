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
