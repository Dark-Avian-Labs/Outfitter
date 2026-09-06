import { gaugeRatio, type GearSlot, type GearStatKey } from './catalog.js';
import { LEFT_SETS, RIGHT_SETS } from './sets.js';

export const GEAR_RANKS = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'] as const;
export type GearRank = (typeof GEAR_RANKS)[number];

export type GearRating = {
  rank: GearRank;
  ruleName: string | null;
};

export type RateableGear = {
  slot: GearSlot;
  set_key: string;
  main_stat: GearStatKey;
  sub1_stat: GearStatKey | null;
  sub1_value: number | null;
  sub2_stat: GearStatKey | null;
  sub2_value: number | null;
  sub3_stat: GearStatKey | null;
  sub3_value: number | null;
  sub4_stat: GearStatKey | null;
  sub4_value: number | null;
};

type SetFilter = 'any' | { except: readonly string[] } | readonly string[];

export type KeepRule = {
  name: string;
  side: 'left' | 'right';
  sets: SetFilter;
  mains: readonly GearStatKey[];
  subPool: readonly GearStatKey[];
  subMin: number;
  essentials: readonly GearStatKey[];
};

const LEFT_KEYS = LEFT_SETS.map((set) => set.key);
const RIGHT_KEYS = RIGHT_SETS.map((set) => set.key);

export const RANK_SCORE: Record<GearRank, number> = {
  D: 0,
  C: 1,
  B: 2,
  A: 3,
  S: 4,
  SS: 5,
  SSS: 6,
};

export const HIGH_ROLL = 0.75;

export const KEEP_RULES: readonly KeepRule[] = [
  {
    name: 'DPS ATK 1',
    side: 'right',
    sets: [
      'greyfang',
      'cataclysm',
      'hells_lament',
      'undying_savage',
      'infernal_roar',
      'soulbound_arcana',
      'ageless_wrath',
      'the_insight',
      'the_wisdom',
      'night_terror',
    ],
    mains: ['atkBonus', 'critDmg', 'atkSpd'],
    subPool: ['atk', 'atkBonus', 'hpBonus', 'rageRegen', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critRate'],
  },
  {
    name: 'DPS ATK 2',
    side: 'right',
    sets: 'any',
    mains: ['atkBonus', 'critDmg', 'atkSpd'],
    subPool: ['atk', 'atkBonus', 'hpBonus', 'rageRegen', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critRate', 'critDmg'],
  },
  {
    name: 'Crit Main',
    side: 'right',
    sets: [
      'greyfang',
      'cataclysm',
      'hells_lament',
      'undying_savage',
      'infernal_roar',
      'soulbound_arcana',
      'ageless_wrath',
      'the_insight',
      'the_wisdom',
      'night_terror',
    ],
    mains: ['critRate'],
    subPool: ['atk', 'atkBonus', 'rageRegen', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critDmg'],
  },
  {
    name: 'T3 Crit',
    side: 'right',
    sets: ['greyfang', 'cataclysm', 'hells_lament', 'undying_savage'],
    mains: ['critRate'],
    subPool: ['atkBonus', 'critDmg'],
    subMin: 2,
    essentials: [],
  },
  {
    name: 'DPS HP',
    side: 'right',
    sets: [
      'greyfang',
      'cataclysm',
      'hells_lament',
      'unshaken_will',
      'undying_savage',
      'infernal_roar',
      'soulbound_arcana',
      'ageless_wrath',
      'asclepius',
      'the_insight',
      'the_wisdom',
      'night_terror',
      'the_glacier',
      'guardian',
    ],
    mains: ['hpBonus', 'critDmg'],
    subPool: ['def', 'hp', 'defBonus', 'hpBonus', 'rageRegen', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 4,
    essentials: ['hpBonus', 'critRate', 'critDmg'],
  },
  {
    name: 'DPS DEF',
    side: 'right',
    sets: [
      'greyfang',
      'cataclysm',
      'tempered_will',
      'hells_lament',
      'undying_savage',
      'infernal_roar',
      'soulbound_arcana',
      'ageless_wrath',
      'the_insight',
      'the_wisdom',
      'night_terror',
      'the_glacier',
      'guardian',
    ],
    mains: ['defBonus', 'critDmg'],
    subPool: ['def', 'hp', 'defBonus', 'hpBonus', 'rageRegen', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 4,
    essentials: ['defBonus', 'critRate', 'critDmg'],
  },
  {
    name: 'Tank 1',
    side: 'right',
    sets: [
      'tempered_will',
      'unshaken_will',
      'morale',
      'undying_savage',
      'invigoration',
      'asclepius',
      'the_glacier',
      'guardian',
    ],
    mains: ['defBonus', 'hpBonus'],
    subPool: ['def', 'hp', 'defBonus', 'hpBonus'],
    subMin: 2,
    essentials: ['defBonus', 'hpBonus'],
  },
  {
    name: 'Tank 2',
    side: 'right',
    sets: { except: ['greyfang'] },
    mains: ['defBonus', 'hpBonus'],
    subPool: ['def', 'hp', 'defBonus', 'hpBonus', 'rageRegen', 'atkSpd'],
    subMin: 4,
    essentials: ['defBonus', 'hpBonus'],
  },
  {
    name: 'ATK Healer',
    side: 'right',
    sets: { except: ['greyfang'] },
    mains: ['atkBonus', 'rageRegen', 'atkSpd'],
    subPool: ['atkBonus', 'rageRegen', 'atkSpd'],
    subMin: 2,
    essentials: [],
  },
  {
    name: 'HP Healer/Util',
    side: 'right',
    sets: { except: ['greyfang'] },
    mains: ['hpBonus', 'rageRegen', 'atkSpd'],
    subPool: ['hpBonus', 'rageRegen', 'atkSpd'],
    subMin: 2,
    essentials: [],
  },
  {
    name: 'Glacier',
    side: 'right',
    sets: ['the_glacier'],
    mains: ['atkBonus', 'hpBonus'],
    subPool: [
      'atk',
      'def',
      'hp',
      'atkBonus',
      'defBonus',
      'hpBonus',
      'rageRegen',
      'critRate',
      'critDmg',
      'healingEffect',
      'atkSpd',
    ],
    subMin: 4,
    essentials: ['atk', 'hp', 'atkBonus', 'hpBonus'],
  },
  {
    name: 'Inspo',
    side: 'right',
    sets: ['wings_of_grace', 'morale', 'invigoration', 'asclepius', 'mana_spring'],
    mains: ['atkBonus'],
    subPool: ['atk', 'hp', 'hpBonus'],
    subMin: 2,
    essentials: ['atk'],
  },
  {
    name: 'ATK DPS Weapon',
    side: 'left',
    sets: [
      'drakefire',
      'wicked_vengeance',
      'warlord',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['atk'],
    subPool: ['atkBonus', 'rageRegen', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critRate'],
  },
  {
    name: 'ATK DPS Chest',
    side: 'left',
    sets: [
      'drakefire',
      'wicked_vengeance',
      'warlord',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['hp'],
    subPool: ['atk', 'atkBonus', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critRate'],
  },
  {
    name: 'ATK No Crit Weapon',
    side: 'left',
    sets: [
      'drakefire',
      'wicked_vengeance',
      'warlord',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['atk'],
    subPool: ['atkBonus', 'hpBonus', 'rageRegen', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critDmg'],
  },
  {
    name: 'ATK No Crit Chest',
    side: 'left',
    sets: [
      'drakefire',
      'wicked_vengeance',
      'warlord',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['hp'],
    subPool: ['atk', 'atkBonus', 'rageRegen', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'critDmg'],
  },
  {
    name: 'HP DPS Weapon',
    side: 'left',
    sets: [
      'goldmane',
      'astral_guardian',
      'wicked_vengeance',
      'immortal_warrior',
      'life_force',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['atk'],
    subPool: ['hp', 'hpBonus', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['hpBonus', 'critRate'],
  },
  {
    name: 'HP DPS Chest',
    side: 'left',
    sets: [
      'goldmane',
      'astral_guardian',
      'wicked_vengeance',
      'immortal_warrior',
      'life_force',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['hp'],
    subPool: ['hpBonus', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['hpBonus', 'critRate'],
  },
  {
    name: 'DEF DPS',
    side: 'left',
    sets: [
      'goldmane',
      'astral_guardian',
      'wicked_vengeance',
      'immortal_warrior',
      'life_force',
      'calamity',
      'whirlwind',
      'annihilating_might',
    ],
    mains: ['atk', 'hp'],
    subPool: ['def', 'defBonus', 'hpBonus', 'critRate', 'critDmg', 'atkSpd'],
    subMin: 3,
    essentials: ['defBonus', 'critRate'],
  },
  {
    name: 'Tank Weapon',
    side: 'left',
    sets: ['goldmane', 'astral_guardian', 'immortal_warrior', 'life_force'],
    mains: ['atk'],
    subPool: ['def', 'hp', 'defBonus', 'hpBonus'],
    subMin: 3,
    essentials: ['defBonus', 'hpBonus'],
  },
  {
    name: 'Tank Chest',
    side: 'left',
    sets: ['goldmane', 'astral_guardian', 'immortal_warrior', 'life_force'],
    mains: ['hp'],
    subPool: ['defBonus', 'hpBonus'],
    subMin: 2,
    essentials: [],
  },
  {
    name: 'ATK Heal Weapon',
    side: 'left',
    sets: [
      'drakefire',
      'astral_guardian',
      'lights_grace',
      'immortal_warrior',
      'warlord',
      'salvation',
      'life_force',
      'calamity',
      'whirlwind',
    ],
    mains: ['atk'],
    subPool: ['hp', 'atkBonus', 'hpBonus', 'rageRegen', 'healingEffect', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus', 'atkSpd'],
  },
  {
    name: 'ATK Heal Chest',
    side: 'left',
    sets: [
      'drakefire',
      'astral_guardian',
      'lights_grace',
      'immortal_warrior',
      'warlord',
      'salvation',
      'life_force',
      'calamity',
      'whirlwind',
    ],
    mains: ['hp'],
    subPool: ['atk', 'atkBonus', 'hpBonus', 'healingEffect', 'atkSpd'],
    subMin: 3,
    essentials: ['atkBonus'],
  },
  {
    name: 'HP Heal Weapon',
    side: 'left',
    sets: [
      'drakefire',
      'astral_guardian',
      'lights_grace',
      'immortal_warrior',
      'warlord',
      'salvation',
      'life_force',
      'calamity',
      'whirlwind',
    ],
    mains: ['atk'],
    subPool: ['hp', 'hpBonus', 'rageRegen', 'healingEffect', 'atkSpd'],
    subMin: 3,
    essentials: ['hpBonus', 'atkSpd'],
  },
  {
    name: 'HP Heal Chest',
    side: 'left',
    sets: [
      'drakefire',
      'astral_guardian',
      'lights_grace',
      'immortal_warrior',
      'warlord',
      'salvation',
      'life_force',
      'calamity',
      'whirlwind',
    ],
    mains: ['hp'],
    subPool: ['hpBonus', 'healingEffect', 'atkSpd'],
    subMin: 2,
    essentials: ['hpBonus'],
  },
  {
    name: 'Speedster',
    side: 'left',
    sets: ['whirlwind'],
    mains: ['atk'],
    subPool: ['hp', 'hpBonus', 'rageRegen', 'atkSpd'],
    subMin: 2,
    essentials: ['atkSpd'],
  },
  {
    name: 'Inspo Weapon',
    side: 'left',
    sets: ['drakefire', 'warlord', 'calamity'],
    mains: ['atk'],
    subPool: ['hp', 'atkBonus', 'hpBonus', 'rageRegen', 'healingEffect', 'atkSpd'],
    subMin: 2,
    essentials: ['atkBonus'],
  },
  {
    name: 'Inspo Chest',
    side: 'left',
    sets: ['drakefire', 'warlord', 'calamity'],
    mains: ['hp'],
    subPool: ['atk', 'atkBonus'],
    subMin: 2,
    essentials: [],
  },
];

export function keysForRule(rule: KeepRule): readonly string[] {
  const sideKeys = rule.side === 'left' ? LEFT_KEYS : RIGHT_KEYS;
  if (rule.sets === 'any') return sideKeys;
  if ('except' in rule.sets) {
    const skip = new Set(rule.sets.except);
    return sideKeys.filter((key) => !skip.has(key));
  }
  return rule.sets;
}

function subsOf(piece: RateableGear): { stat: GearStatKey; value: number }[] {
  return [
    { stat: piece.sub1_stat, value: piece.sub1_value },
    { stat: piece.sub2_stat, value: piece.sub2_value },
    { stat: piece.sub3_stat, value: piece.sub3_value },
    { stat: piece.sub4_stat, value: piece.sub4_value },
  ].filter((entry): entry is { stat: GearStatKey; value: number } => {
    return entry.stat != null && entry.value != null;
  });
}

function hasEssential(
  piece: RateableGear,
  subs: { stat: GearStatKey; value: number }[],
  stat: GearStatKey,
): boolean {
  if (piece.main_stat === stat) return true;
  return subs.some((entry) => entry.stat === stat);
}

function rankFromWanted(wanted: { stat: GearStatKey; value: number }[]): GearRank {
  if (wanted.length === 0) return 'A';
  const ratios = wanted.map((entry) => gaugeRatio(entry.stat, entry.value));
  const high = ratios.filter((ratio) => ratio >= HIGH_ROLL).length;
  const average = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  if (high >= 3) return 'SSS';
  if (high >= 2 || average >= 0.7) return 'SS';
  if (high >= 1 || average >= 0.55) return 'S';
  return 'A';
}

type Roll = { rank: GearRank; average: number; high: number; wanted: number };
type Hit = Roll & { ruleName: string };

function rollOnRule(piece: RateableGear, rule: KeepRule): Roll | null {
  const pool = new Set(rule.subPool);
  const wanted = subsOf(piece).filter((entry) => pool.has(entry.stat));
  if (wanted.length < rule.subMin) return null;
  const ratios = wanted.map((entry) => gaugeRatio(entry.stat, entry.value));
  const high = ratios.filter((ratio) => ratio >= HIGH_ROLL).length;
  const average = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return { rank: rankFromWanted(wanted), average, high, wanted: wanted.length };
}

export function isKeep(piece: RateableGear, rule: KeepRule): boolean {
  if (!keysForRule(rule).includes(piece.set_key)) return false;
  if (!rule.mains.includes(piece.main_stat)) return false;
  const subs = subsOf(piece);
  return rule.essentials.every((stat) => hasEssential(piece, subs, stat));
}

function betterRoll(left: Roll, right: Roll): Roll {
  const rank = RANK_SCORE[right.rank] - RANK_SCORE[left.rank];
  if (rank > 0) return right;
  if (rank < 0) return left;
  if (right.wanted !== left.wanted) return right.wanted > left.wanted ? right : left;
  if (right.average !== left.average) return right.average > left.average ? right : left;
  if (right.high !== left.high) return right.high > left.high ? right : left;
  return left;
}

function missRank(roll: GearRank): GearRank {
  if (roll === 'SSS' || roll === 'SS') return 'B';
  if (roll === 'S') return 'C';
  return 'D';
}

export function rateGear(piece: RateableGear): GearRating {
  let bestKeep: Hit | null = null;
  let bestRoll: Roll | null = null;
  for (const rule of KEEP_RULES) {
    const roll = rollOnRule(piece, rule);
    if (!roll) continue;
    bestRoll = bestRoll ? betterRoll(bestRoll, roll) : roll;
    if (!isKeep(piece, rule)) continue;
    const hit = { ruleName: rule.name, ...roll };
    bestKeep = bestKeep && betterRoll(bestKeep, hit) === bestKeep ? bestKeep : hit;
  }
  if (bestKeep) return { rank: bestKeep.rank, ruleName: bestKeep.ruleName };
  if (!bestRoll) return { rank: 'D', ruleName: null };
  return { rank: missRank(bestRoll.rank), ruleName: null };
}
