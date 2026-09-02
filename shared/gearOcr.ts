import {
  GEAR_SLOTS,
  GEAR_STAT_KEYS,
  MAIN_STAT_BONUS_MAX,
  SLOT_LABELS,
  SLOT_MAIN_STATS,
  type GearPrefix,
  type GearSlot,
  type GearStatKey,
} from './catalog.js';
import { ALL_SETS, setsForSlot } from './sets.js';

export type DetectedGearStat = {
  stat: GearStatKey;
  value: number;
  bonus?: number;
};

export type OcrGearFields = {
  slot: GearSlot;
  set_key: string;
  prefix: GearPrefix;
  main_stat: GearStatKey;
  main_value: number;
  main_bonus: number;
  substats: { stat: GearStatKey; value: number }[];
};

export type ParsedGearOcr = {
  stats: DetectedGearStat[];
  slot: GearSlot | null;
  set_key: string | null;
  prefix: GearPrefix | null;
};

const STAT_ALIASES: readonly { pattern: string; stat: GearStatKey }[] = [
  { pattern: 'ATTACK BONUS', stat: 'atkBonus' },
  { pattern: 'ATK BONUS', stat: 'atkBonus' },
  { pattern: 'DEF BONUS', stat: 'defBonus' },
  { pattern: 'HP BONUS', stat: 'hpBonus' },
  { pattern: 'HEALING EFFECT', stat: 'healingEffect' },
  { pattern: 'HEAL EFFECT', stat: 'healingEffect' },
  { pattern: 'RAGE REGEN', stat: 'rageRegen' },
  { pattern: 'ATTACK SPEED', stat: 'atkSpd' },
  { pattern: 'ATTACK SPD', stat: 'atkSpd' },
  { pattern: 'ATK SPEED', stat: 'atkSpd' },
  { pattern: 'ATK SPD', stat: 'atkSpd' },
  { pattern: 'ATKSPD', stat: 'atkSpd' },
  { pattern: 'ATK SP', stat: 'atkSpd' },
  { pattern: 'SPD', stat: 'atkSpd' },
  { pattern: 'CRIT DAMAGE', stat: 'critDmg' },
  { pattern: 'CRIT RATE', stat: 'critRate' },
  { pattern: 'CRIT DMG', stat: 'critDmg' },
  { pattern: 'CRITRATE', stat: 'critRate' },
  { pattern: 'CRITDMG', stat: 'critDmg' },
  { pattern: 'HEALING', stat: 'healingEffect' },
  { pattern: 'ATK', stat: 'atk' },
  { pattern: 'DEF', stat: 'def' },
  { pattern: 'HP', stat: 'hp' },
];

function normalizeOcrText(text: string): string {
  return text
    .toUpperCase()
    .replace(/\r\n/g, '\n')
    .replace(/[''`´]/g, '')
    .replace(/5PD/g, 'SPD')
    .replace(/\bSP0\b/g, 'SPD')
    .replace(/\bW?K(?=\s*SPD)/g, 'ATK')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/,\s*(?=[A-Z])/g, ' ')
    .replace(/[^A-Z0-9.,%+\n]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function parseStatNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let normalized = trimmed;
  if (/,\d{3}/.test(normalized)) {
    normalized = normalized.replace(/,/g, '');
  } else {
    normalized = normalized.replace(',', '.');
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function allNumbers(text: string): number[] {
  const matches = text.matchAll(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,5}(?:[.,]\d{1,2})?)/g);
  const values: number[] = [];
  for (const match of matches) {
    const value = match[1] ? parseStatNumber(match[1]) : null;
    if (value != null) values.push(value);
  }
  return values;
}

function parseValueAndBonus(
  text: string,
  stat: GearStatKey,
): { value: number; bonus: number } | null {
  const plusMatches = [...text.matchAll(/\+(\d{1,3}(?:[.,]\d{1,2})?)/g)];
  const plusMatch = plusMatches.at(-1);
  const withoutPlus = text.replace(/\+\d+(?:[.,]\d+)?/g, ' ');
  const numbers = allNumbers(withoutPlus);
  const value = numbers[0] ?? null;
  if (value == null) return null;
  const maxBonus = MAIN_STAT_BONUS_MAX[stat] ?? 0;
  let bonus = plusMatch?.[1] ? parseStatNumber(plusMatch[1]) : null;
  if (bonus == null && numbers[1] != null && numbers[1] <= maxBonus) bonus = numbers[1];
  if (bonus != null && bonus > maxBonus) bonus = 0;
  return { value, bonus: bonus ?? 0 };
}

function matchStat(line: string): { stat: GearStatKey; rest: string } | null {
  for (const alias of STAT_ALIASES) {
    const index = line.indexOf(alias.pattern);
    if (index < 0) continue;
    const before = index === 0 ? '' : line[index - 1];
    if (before && /[A-Z0-9]/.test(before)) continue;
    const afterIndex = index + alias.pattern.length;
    const after = afterIndex >= line.length ? '' : line[afterIndex];
    if (after && /[A-Z]/.test(after)) continue;
    return { stat: alias.stat, rest: line.slice(afterIndex) };
  }
  return null;
}

function joinSplitAbbrevLines(lines: string[]): string[] {
  const joined: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];
    if (line === 'CRIT' && next && /^(RATE|DMG)\b/.test(next)) {
      joined.push(`CRIT ${next}`);
      index += 1;
      continue;
    }
    if (/^(ATK|WK|TK)$/.test(line) && next && /^(SPD|SPEED|5PD|SP0)\b/.test(next)) {
      joined.push(`ATK ${next}`);
      index += 1;
      continue;
    }
    if (line) joined.push(line);
  }
  return joined;
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const index = haystack.indexOf(phrase);
  if (index < 0) return false;
  const before = index === 0 ? '' : haystack[index - 1];
  if (before && /[A-Z0-9]/.test(before)) return false;
  const afterIndex = index + phrase.length;
  const after = afterIndex >= haystack.length ? '' : haystack[afterIndex];
  if (after && /[A-Z0-9]/.test(after)) return false;
  return true;
}

const SET_NEEDLES = ALL_SETS.flatMap((set) => {
  const full = normalizeOcrText(set.name).replace(/\n/g, ' ');
  const needles = [full];
  if (full.startsWith('THE ')) needles.push(full.slice(4));
  return needles.map((needle) => ({ key: set.key, needle }));
}).sort((a, b) => b.needle.length - a.needle.length);

const SET_WORD_NEEDLES = (() => {
  const keysByWord = new Map<string, string[]>();
  for (const set of ALL_SETS) {
    const words = normalizeOcrText(set.name)
      .replace(/\n/g, ' ')
      .split(' ')
      .filter((word) => word.length >= 5 && word !== 'THE');
    for (const word of words) {
      const keys = keysByWord.get(word) ?? [];
      if (!keys.includes(set.key)) keys.push(set.key);
      keysByWord.set(word, keys);
    }
  }
  return [...keysByWord.entries()]
    .filter(([, keys]) => keys.length === 1)
    .map(([needle, keys]) => ({ key: keys[0]!, needle }))
    .sort((a, b) => b.needle.length - a.needle.length);
})();

const SLOT_NEEDLES = GEAR_SLOTS.map((slot) => ({
  slot,
  needle: normalizeOcrText(SLOT_LABELS[slot]).replace(/\n/g, ' '),
}));

function ocrLines(text: string): string[] {
  return joinSplitAbbrevLines(
    normalizeOcrText(text)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function findPrefix(blob: string): GearPrefix | null {
  if (hasPhrase(blob, 'VARIANT')) return 'variant';
  if (hasPhrase(blob, 'ANCIENT')) return 'ancient';
  if (hasPhrase(blob, 'MYTHIC GEAR')) return 'none';
  return null;
}

function findSlot(lines: string[]): GearSlot | null {
  let found: GearSlot | null = null;
  for (const line of lines) {
    for (const { slot, needle } of SLOT_NEEDLES) {
      if (hasPhrase(line, needle)) found = slot;
    }
  }
  return found;
}

function findSetKey(blob: string): string | null {
  const spaced = blob.replace(/\n/g, ' ');
  for (const { key, needle } of SET_NEEDLES) {
    if (hasPhrase(spaced, needle)) return key;
  }
  const compact = spaced.replace(/ /g, '');
  for (const { key, needle } of SET_NEEDLES) {
    const compactNeedle = needle.replace(/ /g, '');
    if (compactNeedle.length >= 5 && compact.includes(compactNeedle)) return key;
  }
  for (const { key, needle } of SET_WORD_NEEDLES) {
    if (hasPhrase(spaced, needle)) return key;
  }
  return null;
}

export function mergeGearOcr<T extends ParsedGearOcr>(base: T, extra: T): T {
  const seen = new Set(base.stats.map((entry) => entry.stat));
  const stats = base.stats.slice();
  for (const entry of extra.stats) {
    if (seen.has(entry.stat)) continue;
    seen.add(entry.stat);
    stats.push(entry);
  }
  return {
    ...base,
    stats,
    slot: base.slot ?? extra.slot,
    set_key: base.set_key ?? extra.set_key,
    prefix: base.prefix ?? extra.prefix,
  };
}

export function parseGearOcr(text: string): ParsedGearOcr {
  const lines = ocrLines(text);
  const blob = lines.join('\n');
  const stats: DetectedGearStat[] = [];
  const seen = new Set<GearStatKey>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const matched = matchStat(line);
    if (!matched) continue;
    const isMain = stats.length === 0;
    let source = matched.rest;
    const next = lines[index + 1];
    const restHasValue = allNumbers(matched.rest).length > 0;
    if (next && !matchStat(next) && (isMain || !restHasValue)) {
      source = `${matched.rest} ${next}`.trim();
    }
    const parsed = isMain
      ? parseValueAndBonus(source, matched.stat)
      : (() => {
          const value = allNumbers(source)[0] ?? null;
          return value == null ? null : { value, bonus: 0 };
        })();
    if (parsed == null || seen.has(matched.stat)) continue;
    seen.add(matched.stat);
    stats.push(
      isMain && parsed.bonus > 0
        ? { stat: matched.stat, value: parsed.value, bonus: parsed.bonus }
        : { stat: matched.stat, value: parsed.value },
    );
  }

  return {
    stats,
    slot: findSlot(lines),
    set_key: findSetKey(blob),
    prefix: findPrefix(blob),
  };
}

export function parseGearOcrText(text: string): DetectedGearStat[] {
  return parseGearOcr(text).stats;
}

export function slotForMainStat(stat: GearStatKey, preferred: GearSlot): GearSlot {
  if (SLOT_MAIN_STATS[preferred].includes(stat)) return preferred;
  return GEAR_SLOTS.find((slot) => SLOT_MAIN_STATS[slot].includes(stat)) ?? preferred;
}

function padSubstats(
  entries: { stat: GearStatKey; value: number }[],
): { stat: GearStatKey; value: number }[] {
  const substats = entries.slice(0, 4);
  while (substats.length < 4) {
    const used = new Set(substats.map((entry) => entry.stat));
    const next = GEAR_STAT_KEYS.find((key) => !used.has(key)) ?? 'atk';
    substats.push({ stat: next, value: 0 });
  }
  return substats;
}

export function applyOcrStats<T extends OcrGearFields>(draft: T, parsed: ParsedGearOcr): T {
  const detected = parsed.stats;
  if (
    detected.length === 0 &&
    parsed.slot == null &&
    parsed.set_key == null &&
    parsed.prefix == null
  ) {
    return draft;
  }
  const main = detected[0];
  let slot = draft.slot;
  if (parsed.slot && (!main || SLOT_MAIN_STATS[parsed.slot].includes(main.stat))) {
    slot = parsed.slot;
  } else if (main) {
    slot = slotForMainStat(main.stat, parsed.slot ?? draft.slot);
  }
  const slotSets = setsForSlot(slot);
  let setKey = draft.set_key;
  if (parsed.set_key && slotSets.some((set) => set.key === parsed.set_key)) {
    setKey = parsed.set_key;
  } else if (!slotSets.some((set) => set.key === setKey)) {
    setKey = slotSets[0]?.key ?? setKey;
  }
  const prefix = parsed.prefix ?? draft.prefix;
  if (!main) {
    return { ...draft, slot, set_key: setKey, prefix };
  }
  return {
    ...draft,
    slot,
    set_key: setKey,
    prefix,
    main_stat: main.stat,
    main_value: main.value,
    main_bonus: Math.min(main.bonus ?? 0, MAIN_STAT_BONUS_MAX[main.stat] ?? 0),
    substats: padSubstats(detected.slice(1)),
  };
}
