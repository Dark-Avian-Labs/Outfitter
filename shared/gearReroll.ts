import {
  GEAR_STAT_LABELS,
  SUBSTAT_RANGE,
  gaugeRatio,
  type GearPrefix,
  type GearStatKey,
} from './catalog.js';
import {
  HIGH_ROLL,
  KEEP_RULES,
  RANK_SCORE,
  isKeep,
  keysForRule,
  rateGear,
  type GearRank,
  type GearRating,
  type KeepRule,
  type RateableGear,
} from './gearRating.js';
import { SET_BY_KEY } from './sets.js';

export const REROLL_TOOL_IDS = [
  'recasting_hammer',
  'advanced_recasting_hammer',
  'refining_crystal',
  'advanced_refining_crystal',
  'transmutation_gem',
  'kukulkans_spirit',
  'primitive_spirit',
  'enchantress_spirit',
] as const;

export type RerollToolId = (typeof REROLL_TOOL_IDS)[number];

export type RerollableGear = RateableGear & { prefix: GearPrefix };

export type RerollSuggestion = {
  tool: RerollToolId;
  current: GearRating;
  projected: GearRating;
  subSlot: 1 | 2 | 3 | 4 | null;
  fromStat: GearStatKey | null;
  toStat: GearStatKey | null;
  toSet: string | null;
  fromSet: string | null;
  needsBullion: boolean;
};

type SubSlot = 1 | 2 | 3 | 4;

const SUB_SLOTS: readonly SubSlot[] = [1, 2, 3, 4];

export const REROLL_TOOLS: {
  id: RerollToolId;
  label: string;
  icon: string;
  hint: string;
}[] = [
  {
    id: 'recasting_hammer',
    label: 'Gear Recasting Hammer',
    icon: '/materials/recasting-hammer.webp',
    hint: 'Rerolls all four substats. Normal mythic only.',
  },
  {
    id: 'advanced_recasting_hammer',
    label: 'Advanced Gear Recasting Hammer',
    icon: '/materials/advanced-recasting-hammer.webp',
    hint: 'Rerolls all four substats. Ancient and Variant only.',
  },
  {
    id: 'refining_crystal',
    label: 'Refining Crystal',
    icon: '/materials/refining-crystal.webp',
    hint: 'Rerolls one substat. That line stays locked.',
  },
  {
    id: 'advanced_refining_crystal',
    label: 'Advanced Refining Crystal',
    icon: '/materials/advanced-refining-crystal.webp',
    hint: 'Rerolls one substat. Ancient and Variant only. That line stays locked.',
  },
  {
    id: 'transmutation_gem',
    label: 'Transmutation Gem',
    icon: '/materials/transmutation-gem.webp',
    hint: 'Changes one substat type and keeps the fill. Ancient and Variant only. That line stays locked.',
  },
  {
    id: 'kukulkans_spirit',
    label: "Kukulkan's Spirit",
    icon: '/materials/kukulkans-spirit.webp',
    hint: 'Calamity → Warlord. Life Force → Immortal Warrior. Ancient and Variant also need Eternal Bullion.',
  },
  {
    id: 'primitive_spirit',
    label: 'Primitive Spirit',
    icon: '/materials/primitive-spirit.webp',
    hint: 'Night Terror → Ageless Wrath. Asclepius → Invigoration. Ancient and Variant also need Eternal Bullion.',
  },
  {
    id: 'enchantress_spirit',
    label: "Enchantress's Spirit",
    icon: '/materials/enchantress-spirit.webp',
    hint: 'The Insight → Infernal Roar. The Wisdom → Soulbound Arcana. Ancient and Variant also need Eternal Bullion.',
  },
];

export const BULLION_ICON = '/materials/eternal-bullion.webp';

const SET_ASCEND: Record<string, { to: string; tool: RerollToolId }> = {
  calamity: { to: 'warlord', tool: 'kukulkans_spirit' },
  life_force: { to: 'immortal_warrior', tool: 'kukulkans_spirit' },
  night_terror: { to: 'ageless_wrath', tool: 'primitive_spirit' },
  asclepius: { to: 'invigoration', tool: 'primitive_spirit' },
  the_insight: { to: 'infernal_roar', tool: 'enchantress_spirit' },
  the_wisdom: { to: 'soulbound_arcana', tool: 'enchantress_spirit' },
};

function isAncientOrVariant(prefix: GearPrefix): boolean {
  return prefix === 'ancient' || prefix === 'variant';
}

function hammerTool(prefix: GearPrefix): RerollToolId {
  return isAncientOrVariant(prefix) ? 'advanced_recasting_hammer' : 'recasting_hammer';
}

function crystalTool(prefix: GearPrefix): RerollToolId {
  return isAncientOrVariant(prefix) ? 'advanced_refining_crystal' : 'refining_crystal';
}

function highRollValue(stat: GearStatKey): number {
  return SUBSTAT_RANGE[stat].max * HIGH_ROLL;
}

function valueAtRatio(stat: GearStatKey, ratio: number): number {
  return SUBSTAT_RANGE[stat].max * ratio;
}

function isRatedKeep(rating: GearRating): boolean {
  return rating.ruleName != null;
}

function isAwesome(rank: GearRank): boolean {
  return rank === 'SS' || rank === 'SSS';
}

function worthIt(current: GearRank, projected: GearRank): boolean {
  if (!isAwesome(projected)) return false;
  return RANK_SCORE[projected] > RANK_SCORE[current];
}

function getStat(piece: RateableGear, slot: SubSlot): GearStatKey | null {
  switch (slot) {
    case 1:
      return piece.sub1_stat;
    case 2:
      return piece.sub2_stat;
    case 3:
      return piece.sub3_stat;
    case 4:
      return piece.sub4_stat;
  }
}

function getValue(piece: RateableGear, slot: SubSlot): number | null {
  switch (slot) {
    case 1:
      return piece.sub1_value;
    case 2:
      return piece.sub2_value;
    case 3:
      return piece.sub3_value;
    case 4:
      return piece.sub4_value;
  }
}

function setSub(
  piece: RateableGear,
  slot: SubSlot,
  stat: GearStatKey,
  value: number,
): RateableGear {
  switch (slot) {
    case 1:
      return { ...piece, sub1_stat: stat, sub1_value: value };
    case 2:
      return { ...piece, sub2_stat: stat, sub2_value: value };
    case 3:
      return { ...piece, sub3_stat: stat, sub3_value: value };
    case 4:
      return { ...piece, sub4_stat: stat, sub4_value: value };
  }
}

function occupiedStats(piece: RateableGear, skip: SubSlot): Set<GearStatKey> {
  const taken = new Set<GearStatKey>([piece.main_stat]);
  for (const slot of SUB_SLOTS) {
    if (slot === skip) continue;
    const stat = getStat(piece, slot);
    if (stat) taken.add(stat);
  }
  return taken;
}

function matchingRules(piece: RateableGear): KeepRule[] {
  return KEEP_RULES.filter(
    (rule) => keysForRule(rule).includes(piece.set_key) && rule.mains.includes(piece.main_stat),
  );
}

function wantedCount(piece: RateableGear, rule: KeepRule): number {
  const pool = new Set(rule.subPool);
  let count = 0;
  for (const slot of SUB_SLOTS) {
    const stat = getStat(piece, slot);
    if (stat && pool.has(stat)) count += 1;
  }
  return count;
}

function missingEssentials(piece: RateableGear, rule: KeepRule): GearStatKey[] {
  return rule.essentials.filter((stat) => {
    if (piece.main_stat === stat) return false;
    return !SUB_SLOTS.some((slot) => getStat(piece, slot) === stat);
  });
}

function nearMissRules(piece: RateableGear): KeepRule[] {
  return matchingRules(piece).filter(
    (rule) => wantedCount(piece, rule) >= rule.subMin && !isKeep(piece, rule),
  );
}

function betterTransmute(
  piece: RateableGear,
  left: RerollSuggestion,
  right: RerollSuggestion,
): RerollSuggestion {
  const rank = RANK_SCORE[right.projected.rank] - RANK_SCORE[left.projected.rank];
  if (rank > 0) return right;
  if (rank < 0) return left;
  const leftDump = dumpScore(piece, left);
  const rightDump = dumpScore(piece, right);
  if (rightDump !== leftDump) return rightDump > leftDump ? right : left;
  return left;
}

function dumpScore(piece: RateableGear, suggestion: RerollSuggestion): number {
  const slot = suggestion.subSlot;
  const fromStat = suggestion.fromStat;
  if (slot == null || fromStat == null) return 0;
  const value = getValue(piece, slot) ?? 0;
  const fill = 1 - gaugeRatio(fromStat, value);
  const rule = KEEP_RULES.find((entry) => entry.name === suggestion.projected.ruleName);
  const inPool = rule ? rule.subPool.includes(fromStat) : true;
  return (inPool ? 0 : 2) + fill;
}

function allowedToStats(piece: RateableGear, alreadyKeep: boolean): Set<GearStatKey> | null {
  const near = nearMissRules(piece);
  if (near.length > 0) {
    const needed = new Set<GearStatKey>();
    for (const rule of near) {
      for (const stat of missingEssentials(piece, rule)) needed.add(stat);
    }
    return needed;
  }
  if (!alreadyKeep) return null;
  const extras = new Set<GearStatKey>();
  for (const rule of matchingRules(piece)) {
    if (!isKeep(piece, rule)) continue;
    for (const stat of rule.subPool) extras.add(stat);
  }
  return extras.size > 0 ? extras : null;
}

function betterRefine(
  piece: RateableGear,
  left: RerollSuggestion,
  right: RerollSuggestion,
): RerollSuggestion {
  const rank = RANK_SCORE[right.projected.rank] - RANK_SCORE[left.projected.rank];
  if (rank > 0) return right;
  if (rank < 0) return left;
  const leftStat = left.fromStat;
  const rightStat = right.fromStat;
  const leftSlot = left.subSlot;
  const rightSlot = right.subSlot;
  if (leftStat == null || rightStat == null || leftSlot == null || rightSlot == null) return left;
  const leftRatio = gaugeRatio(leftStat, getValue(piece, leftSlot) ?? 0);
  const rightRatio = gaugeRatio(rightStat, getValue(piece, rightSlot) ?? 0);
  return rightRatio < leftRatio ? right : left;
}

function recastPiece(piece: RateableGear): RateableGear {
  let next = piece;
  for (const slot of SUB_SLOTS) {
    const stat = getStat(piece, slot);
    const value = getValue(piece, slot);
    if (stat == null || value == null) continue;
    next = setSub(next, slot, stat, highRollValue(stat));
  }
  return next;
}

function suggestRefine(piece: RerollableGear, current: GearRating): RerollSuggestion | null {
  if (!isRatedKeep(current) || current.rank === 'SSS') return null;
  let best: RerollSuggestion | null = null;
  for (const slot of SUB_SLOTS) {
    const stat = getStat(piece, slot);
    const value = getValue(piece, slot);
    if (stat == null || value == null) continue;
    if (gaugeRatio(stat, value) >= HIGH_ROLL) continue;
    const projected = rateGear(setSub(piece, slot, stat, highRollValue(stat)));
    if (!worthIt(current.rank, projected.rank)) continue;
    const candidate: RerollSuggestion = {
      tool: crystalTool(piece.prefix),
      current,
      projected,
      subSlot: slot,
      fromStat: stat,
      toStat: stat,
      toSet: null,
      fromSet: null,
      needsBullion: false,
    };
    best = best ? betterRefine(piece, best, candidate) : candidate;
  }
  return best;
}

function suggestRecast(piece: RerollableGear, current: GearRating): RerollSuggestion | null {
  if (!isRatedKeep(current) || current.rank !== 'A') return null;
  const projected = rateGear(recastPiece(piece));
  if (!worthIt(current.rank, projected.rank)) return null;
  return {
    tool: hammerTool(piece.prefix),
    current,
    projected,
    subSlot: null,
    fromStat: null,
    toStat: null,
    toSet: null,
    fromSet: null,
    needsBullion: false,
  };
}

function suggestTransmute(piece: RerollableGear, current: GearRating): RerollSuggestion | null {
  if (!isAncientOrVariant(piece.prefix) || current.rank === 'SSS' || current.rank === 'D') {
    return null;
  }
  const allowed = allowedToStats(piece, isRatedKeep(current));
  if (allowed == null || allowed.size === 0) return null;
  const lowOnly: RerollSuggestion[] = [];
  const any: RerollSuggestion[] = [];
  for (const slot of SUB_SLOTS) {
    const fromStat = getStat(piece, slot);
    const fromValue = getValue(piece, slot);
    if (fromStat == null || fromValue == null) continue;
    const ratio = gaugeRatio(fromStat, fromValue);
    const taken = occupiedStats(piece, slot);
    for (const toStat of allowed) {
      if (toStat === fromStat || taken.has(toStat)) continue;
      const projected = rateGear(setSub(piece, slot, toStat, valueAtRatio(toStat, ratio)));
      if (!worthIt(current.rank, projected.rank) || projected.ruleName == null) continue;
      const candidate: RerollSuggestion = {
        tool: 'transmutation_gem',
        current,
        projected,
        subSlot: slot,
        fromStat,
        toStat,
        toSet: null,
        fromSet: null,
        needsBullion: false,
      };
      any.push(candidate);
      if (ratio < HIGH_ROLL) lowOnly.push(candidate);
    }
  }
  const pool = lowOnly.length > 0 ? lowOnly : any;
  let best: RerollSuggestion | null = null;
  for (const candidate of pool) {
    best = best ? betterTransmute(piece, best, candidate) : candidate;
  }
  return best;
}

function suggestAscend(piece: RerollableGear, current: GearRating): RerollSuggestion | null {
  const spec = SET_ASCEND[piece.set_key];
  if (!spec || !isRatedKeep(current)) return null;
  const projected = rateGear({ ...piece, set_key: spec.to });
  return {
    tool: spec.tool,
    current,
    projected,
    subSlot: null,
    fromStat: null,
    toStat: null,
    toSet: spec.to,
    fromSet: piece.set_key,
    needsBullion: isAncientOrVariant(piece.prefix),
  };
}

export function suggestReroll(piece: RerollableGear): RerollSuggestion[] {
  const current = rateGear(piece);
  const refine = suggestRefine(piece, current);
  const recast = refine ? null : suggestRecast(piece, current);
  const transmute = suggestTransmute(piece, current);
  const ascend = suggestAscend(piece, current);
  return [refine, recast, transmute, ascend].filter((row): row is RerollSuggestion => row != null);
}

export function setDisplayName(setKey: string): string {
  return SET_BY_KEY[setKey]?.name ?? setKey;
}

export function rerollActionLabel(suggestion: RerollSuggestion): string {
  if (suggestion.fromSet && suggestion.toSet) {
    return `${setDisplayName(suggestion.fromSet)} → ${setDisplayName(suggestion.toSet)}`;
  }
  if (suggestion.tool === 'transmutation_gem' && suggestion.fromStat && suggestion.toStat) {
    return `${GEAR_STAT_LABELS[suggestion.fromStat]} → ${GEAR_STAT_LABELS[suggestion.toStat]}`;
  }
  if (
    (suggestion.tool === 'refining_crystal' || suggestion.tool === 'advanced_refining_crystal') &&
    suggestion.fromStat
  ) {
    return `Reroll ${GEAR_STAT_LABELS[suggestion.fromStat]}`;
  }
  return 'Reroll all substats';
}
