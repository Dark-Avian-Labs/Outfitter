import { GEAR_SLOTS, type GearSlot } from './catalog.js';
import {
  attacksPerSecond,
  computeFinalStats,
  type FinalStats,
  type HeroBaseStats,
} from './formulas.js';
import { loadoutStatBag, type GearPieceInput } from './pieceStats.js';

export const SCORE_STAT_KEYS = [
  'atk',
  'hp',
  'def',
  'critRate',
  'critDmg',
  'atkSpd',
  'healingEffect',
  'rageRegen',
  'rageRegenAuto',
  'damageTaken',
  'aoeDamage',
  'stDamage',
  'basicAtkDamage',
  'damageAfterCrit',
  'damageAfterUlt',
  'critDmgAfterUlt',
] as const;
export type ScoreStatKey = (typeof SCORE_STAT_KEYS)[number];

export const SCORE_STAT_LABELS: Record<ScoreStatKey, string> = {
  atk: 'ATK',
  hp: 'HP',
  def: 'DEF',
  critRate: 'Crit Rate',
  critDmg: 'Crit Damage',
  atkSpd: 'ATK Speed',
  healingEffect: 'Healing Effect',
  rageRegen: 'Rage Regen %',
  rageRegenAuto: 'Rage Regen (Auto)',
  damageTaken: 'Damage Taken reduction',
  aoeDamage: 'AoE Damage',
  stDamage: 'Single-target Damage',
  basicAtkDamage: 'Basic ATK Damage',
  damageAfterCrit: 'Damage after crit',
  damageAfterUlt: 'Damage after ult',
  critDmgAfterUlt: 'Crit Damage after ult',
};

export type OptimizerRequest = {
  hero: HeroBaseStats;
  pieces: GearPieceInput[];
  weights: Partial<Record<ScoreStatKey, number>>;
  minimums: Partial<Record<ScoreStatKey, number>>;
  desiredLeftSet?: string | null;
  desiredRightSet?: string | null;
  forceSets: boolean;
  includeEquippedHeroSlug?: string | null;
};

export type RankedLoadout = {
  score: number;
  pieces: GearPieceInput[];
  stats: FinalStats;
};

const FULL_ENUM_LIMIT = 2_000_000;
const SCORE_KEEP = 20;
const MIN_KEEP = 12;
const SET_KEEP = 4;
const DESIRED_SET_KEEP = 16;
const RESULT_COUNT = 3;

function bySlot(pieces: GearPieceInput[]): Record<GearSlot, GearPieceInput[]> {
  const grouped: Record<GearSlot, GearPieceInput[]> = {
    weapon: [],
    armor: [],
    bangle: [],
    amulet: [],
    ring: [],
  };
  for (const piece of pieces) {
    grouped[piece.slot].push(piece);
  }
  return grouped;
}

function filterInventory(request: OptimizerRequest): GearPieceInput[] {
  return request.pieces.filter((piece) => {
    if (piece.equippedHeroSlug) {
      if (!request.includeEquippedHeroSlug) return false;
      if (piece.equippedHeroSlug !== request.includeEquippedHeroSlug) return false;
    }
    if (request.forceSets) {
      const isLeft = piece.slot === 'weapon' || piece.slot === 'armor';
      if (isLeft && request.desiredLeftSet && piece.setKey !== request.desiredLeftSet) return false;
      if (!isLeft && request.desiredRightSet && piece.setKey !== request.desiredRightSet) {
        return false;
      }
    }
    return true;
  });
}

function scoreValue(stat: ScoreStatKey, stats: FinalStats, hero: HeroBaseStats): number {
  switch (stat) {
    case 'atk':
      return stats.atk / 100;
    case 'hp':
      return stats.hp / 500;
    case 'def':
      return stats.def / 50;
    case 'critRate':
      return stats.critRate;
    case 'critDmg':
      return stats.critDmg;
    case 'atkSpd': {
      const baseAps = attacksPerSecond(hero.atkInterval, 100);
      const aps = attacksPerSecond(hero.atkInterval, stats.atkSpd);
      if (baseAps <= 0) return 0;
      return (aps / baseAps - 1) * 100;
    }
    case 'healingEffect':
      return (stats.healMultiplier - 1) * 100;
    case 'rageRegen':
      return stats.rageRegen;
    case 'rageRegenAuto':
      return stats.rageRegenAuto;
    case 'damageTaken':
      return -stats.damageTaken;
    case 'aoeDamage':
      return stats.aoeDamage;
    case 'stDamage':
      return stats.stDamage;
    case 'basicAtkDamage':
      return stats.basicAtkDamage;
    case 'damageAfterCrit':
      return stats.damageAfterCrit;
    case 'damageAfterUlt':
      return stats.damageAfterUlt;
    case 'critDmgAfterUlt':
      return stats.critDmgAfterUlt;
    default: {
      const _exhaustive: never = stat;
      return _exhaustive;
    }
  }
}

function rawForMinimum(stat: ScoreStatKey, stats: FinalStats): number {
  switch (stat) {
    case 'atk':
      return stats.atk;
    case 'hp':
      return stats.hp;
    case 'def':
      return stats.def;
    case 'critRate':
      return stats.critRate;
    case 'critDmg':
      return stats.critDmg;
    case 'atkSpd':
      return stats.atkSpd;
    case 'healingEffect':
      return stats.healingEffect;
    case 'rageRegen':
      return stats.rageRegen;
    case 'rageRegenAuto':
      return stats.rageRegenAuto;
    case 'damageTaken':
      return -stats.damageTaken;
    case 'aoeDamage':
      return stats.aoeDamage;
    case 'stDamage':
      return stats.stDamage;
    case 'basicAtkDamage':
      return stats.basicAtkDamage;
    case 'damageAfterCrit':
      return stats.damageAfterCrit;
    case 'damageAfterUlt':
      return stats.damageAfterUlt;
    case 'critDmgAfterUlt':
      return stats.critDmgAfterUlt;
    default: {
      const _exhaustive: never = stat;
      return _exhaustive;
    }
  }
}

function scoreLoadout(stats: FinalStats, request: OptimizerRequest): number | null {
  for (const key of SCORE_STAT_KEYS) {
    const minimum = request.minimums[key];
    if (minimum == null || Number.isNaN(minimum)) continue;
    if (rawForMinimum(key, stats) < minimum) return null;
  }

  let score = 0;
  for (const key of SCORE_STAT_KEYS) {
    const weight = request.weights[key] ?? 0;
    if (weight <= 0) continue;
    score += weight * scoreValue(key, stats, request.hero);
  }
  return score;
}

function evaluate(pieces: GearPieceInput[], request: OptimizerRequest): RankedLoadout | null {
  const bag = loadoutStatBag(pieces);
  const stats = computeFinalStats(request.hero, bag);
  let score = scoreLoadout(stats, request);
  if (score == null) return null;
  const weapon = pieces.find((piece) => piece.slot === 'weapon');
  const armor = pieces.find((piece) => piece.slot === 'armor');
  const bangle = pieces.find((piece) => piece.slot === 'bangle');
  if (
    request.desiredLeftSet &&
    weapon?.setKey === request.desiredLeftSet &&
    armor?.setKey === request.desiredLeftSet
  ) {
    score += 1;
  }
  if (
    request.desiredRightSet &&
    bangle?.setKey === request.desiredRightSet &&
    pieces.every(
      (piece) =>
        piece.slot === 'weapon' ||
        piece.slot === 'armor' ||
        piece.setKey === request.desiredRightSet,
    )
  ) {
    score += 1;
  }
  return { score, pieces, stats };
}

function comboCount(grouped: Record<GearSlot, GearPieceInput[]>): number {
  return GEAR_SLOTS.reduce((product, slot) => product * Math.max(grouped[slot].length, 0), 1);
}

function activeMinimumKeys(request: OptimizerRequest): ScoreStatKey[] {
  const keys: ScoreStatKey[] = [];
  for (const key of SCORE_STAT_KEYS) {
    const minimum = request.minimums[key];
    if (minimum == null || Number.isNaN(minimum)) continue;
    keys.push(key);
  }
  return keys;
}

function desiredSetForSlot(slot: GearSlot, request: OptimizerRequest): string | null {
  if (slot === 'weapon' || slot === 'armor') {
    return request.desiredLeftSet || null;
  }
  return request.desiredRightSet || null;
}

function soloStats(piece: GearPieceInput, hero: OptimizerRequest['hero']): FinalStats {
  return computeFinalStats(hero, loadoutStatBag([piece]));
}

function pieceWeightHint(piece: GearPieceInput, request: OptimizerRequest): number {
  const stats = soloStats(piece, request.hero);
  let score = 0;
  for (const key of SCORE_STAT_KEYS) {
    const weight = request.weights[key] ?? 0;
    if (weight <= 0) continue;
    score += weight * scoreValue(key, stats, request.hero);
  }
  for (const key of activeMinimumKeys(request)) {
    score += rawForMinimum(key, stats) * 0.01;
  }
  return score;
}

function takeTop(
  pieces: GearPieceInput[],
  limit: number,
  scoreOf: (piece: GearPieceInput) => number,
): GearPieceInput[] {
  if (pieces.length <= limit) return pieces;
  return [...pieces]
    .sort((left, right) => {
      const delta = scoreOf(right) - scoreOf(left);
      if (delta !== 0) return delta;
      return left.id - right.id;
    })
    .slice(0, limit);
}

function unionById(groups: GearPieceInput[][]): GearPieceInput[] {
  const seen = new Set<number>();
  const merged: GearPieceInput[] = [];
  for (const group of groups) {
    for (const piece of group) {
      if (seen.has(piece.id)) continue;
      seen.add(piece.id);
      merged.push(piece);
    }
  }
  return merged;
}

function reservedIdsForSlot(
  pieces: GearPieceInput[],
  slot: GearSlot,
  request: OptimizerRequest,
): Set<number> {
  const groups: GearPieceInput[][] = [];
  groups.push(takeTop(pieces, 1, (piece) => pieceWeightHint(piece, request)));
  for (const key of activeMinimumKeys(request)) {
    groups.push(takeTop(pieces, 1, (piece) => rawForMinimum(key, soloStats(piece, request.hero))));
  }
  const desired = desiredSetForSlot(slot, request);
  if (desired) {
    groups.push(
      takeTop(
        pieces.filter((piece) => piece.setKey === desired),
        1,
        (piece) => pieceWeightHint(piece, request),
      ),
    );
  }
  return new Set(unionById(groups).map((piece) => piece.id));
}

function keepForSlot(
  pieces: GearPieceInput[],
  slot: GearSlot,
  request: OptimizerRequest,
): GearPieceInput[] {
  const groups: GearPieceInput[][] = [
    takeTop(pieces, SCORE_KEEP, (piece) => pieceWeightHint(piece, request)),
  ];
  for (const key of activeMinimumKeys(request)) {
    groups.push(
      takeTop(pieces, MIN_KEEP, (piece) => rawForMinimum(key, soloStats(piece, request.hero))),
    );
  }
  const desired = desiredSetForSlot(slot, request);
  if (desired) {
    groups.push(
      takeTop(
        pieces.filter((piece) => piece.setKey === desired),
        DESIRED_SET_KEEP,
        (piece) => pieceWeightHint(piece, request),
      ),
    );
  }
  const bySet = new Map<string, GearPieceInput[]>();
  for (const piece of pieces) {
    const bucket = bySet.get(piece.setKey);
    if (bucket) bucket.push(piece);
    else bySet.set(piece.setKey, [piece]);
  }
  for (const setPieces of bySet.values()) {
    groups.push(takeTop(setPieces, SET_KEEP, (piece) => pieceWeightHint(piece, request)));
  }
  return unionById(groups);
}

function dropWorstExtra(
  grouped: Record<GearSlot, GearPieceInput[]>,
  reserved: Record<GearSlot, Set<number>>,
  request: OptimizerRequest,
): boolean {
  let worstSlot: GearSlot | null = null;
  let worstId = -1;
  let worstScore = Number.POSITIVE_INFINITY;
  let largestCount = 0;
  for (const slot of GEAR_SLOTS) {
    const pieces = grouped[slot];
    if (pieces.length <= 1) continue;
    for (const piece of pieces) {
      if (reserved[slot].has(piece.id)) continue;
      const score = pieceWeightHint(piece, request);
      if (
        pieces.length > largestCount ||
        (pieces.length === largestCount && score < worstScore) ||
        (pieces.length === largestCount && score === worstScore && piece.id > worstId)
      ) {
        largestCount = pieces.length;
        worstScore = score;
        worstSlot = slot;
        worstId = piece.id;
      }
    }
  }
  if (worstSlot == null) return false;
  grouped[worstSlot] = grouped[worstSlot].filter((piece) => piece.id !== worstId);
  return true;
}

function pruneSlots(
  grouped: Record<GearSlot, GearPieceInput[]>,
  request: OptimizerRequest,
): Record<GearSlot, GearPieceInput[]> {
  const next: Record<GearSlot, GearPieceInput[]> = {
    weapon: [],
    armor: [],
    bangle: [],
    amulet: [],
    ring: [],
  };
  const reserved: Record<GearSlot, Set<number>> = {
    weapon: new Set(),
    armor: new Set(),
    bangle: new Set(),
    amulet: new Set(),
    ring: new Set(),
  };
  for (const slot of GEAR_SLOTS) {
    next[slot] = keepForSlot(grouped[slot], slot, request);
    reserved[slot] = reservedIdsForSlot(grouped[slot], slot, request);
  }
  while (comboCount(next) > FULL_ENUM_LIMIT) {
    if (dropWorstExtra(next, reserved, request)) continue;
    break;
  }
  return next;
}

function searchGrouped(
  grouped: Record<GearSlot, GearPieceInput[]>,
  request: OptimizerRequest,
): RankedLoadout[] {
  const best: RankedLoadout[] = [];
  function consider(candidate: RankedLoadout | null): void {
    if (!candidate) return;
    best.push(candidate);
    best.sort((left, right) => right.score - left.score);
    if (best.length > RESULT_COUNT) best.length = RESULT_COUNT;
  }

  for (const weapon of grouped.weapon) {
    for (const armor of grouped.armor) {
      for (const bangle of grouped.bangle) {
        for (const amulet of grouped.amulet) {
          for (const ring of grouped.ring) {
            consider(evaluate([weapon, armor, bangle, amulet, ring], request));
          }
        }
      }
    }
  }
  return best;
}

export function optimizeLoadouts(request: OptimizerRequest): RankedLoadout[] {
  const inventory = filterInventory(request);
  let grouped = bySlot(inventory);
  for (const slot of GEAR_SLOTS) {
    if (grouped[slot].length === 0) return [];
  }
  if (comboCount(grouped) > FULL_ENUM_LIMIT) {
    grouped = pruneSlots(grouped, request);
  }
  return searchGrouped(grouped, request);
}
