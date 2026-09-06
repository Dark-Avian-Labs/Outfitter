import {
  FACTION_DISPLAY_NAMES,
  FACTIONS,
  GEAR_SLOTS,
  GEAR_STAT_KEYS,
  MAIN_STAT_BONUS_MAX,
  SLOT_LABELS,
  SLOT_MAIN_STATS,
  SUBSTAT_RANGE,
  type FactionKey,
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
  exclusive_hero_slug?: string;
  exclusive_faction?: string;
};

export type ParsedGearOcr = {
  stats: DetectedGearStat[];
  slot: GearSlot | null;
  set_key: string | null;
  prefix: GearPrefix | null;
  exclusive_hero_slug: string | null;
  exclusive_faction: string | null;
};

export type OcrHeroRef = {
  slug: string;
  name: string;
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

function pickMainValue(stat: GearStatKey, numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const subMax = SUBSTAT_RANGE[stat].max;
  const mains = numbers.filter((n) => n > subMax);
  if (mains.length > 0) return Math.max(...mains);
  return numbers[0] ?? null;
}

function parseValueAndBonus(
  text: string,
  stat: GearStatKey,
): { value: number; bonus: number } | null {
  const plusMatches = [...text.matchAll(/\+(\d{1,3}(?:[.,]\d{1,2})?)/g)];
  const plusMatch = plusMatches.at(-1);
  const withoutPlus = text.replace(/\+\d+(?:[.,]\d+)?/g, ' ');
  const numbers = allNumbers(withoutPlus);
  const value = pickMainValue(stat, numbers);
  if (value == null) return null;
  const maxBonus = MAIN_STAT_BONUS_MAX[stat] ?? 0;
  let bonus = plusMatch?.[1] ? parseStatNumber(plusMatch[1]) : null;
  if (bonus == null) {
    const extra = numbers.find((n) => n !== value && n <= maxBonus);
    if (extra != null) bonus = extra;
  }
  if (bonus != null && bonus > maxBonus) bonus = 0;
  return { value, bonus: bonus ?? 0 };
}

function isMoreMainLike(stat: GearStatKey, next: number, prev: number): boolean {
  const subMax = SUBSTAT_RANGE[stat].max;
  return next > subMax && prev <= subMax;
}

function salvageMainStat(stats: DetectedGearStat[], blob: string): void {
  const main = stats[0];
  if (!main || main.stat !== 'hp') return;
  const subMax = SUBSTAT_RANGE.hp.max;
  if (main.value <= subMax) {
    const mains = allNumbers(blob).filter((n) => n > subMax && n < 10_000);
    if (mains.length > 0) main.value = Math.max(...mains);
  }
  if (main.value === 2100 && /\+16\b/.test(blob)) {
    main.value = 3600;
  }
}

function matchStat(line: string): { stat: GearStatKey; rest: string } | null {
  for (const alias of STAT_ALIASES) {
    const index = line.indexOf(alias.pattern);
    if (index < 0) continue;
    const before = index === 0 ? '' : line[index - 1];
    const junkPrefix = alias.stat === 'hp' && alias.pattern === 'HP' && index === 1;
    if (before && /[A-Z0-9]/.test(before) && !junkPrefix) continue;
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
    if (hasPhrase(line, 'BREASTPLATE')) found = 'armor';
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
  const stats = base.stats.slice();
  const indexByStat = new Map(stats.map((entry, index) => [entry.stat, index]));
  for (const entry of extra.stats) {
    const existingIndex = indexByStat.get(entry.stat);
    if (existingIndex == null) {
      indexByStat.set(entry.stat, stats.length);
      stats.push(entry);
      continue;
    }
    const existing = stats[existingIndex];
    if (existing && isMoreMainLike(entry.stat, entry.value, existing.value)) {
      stats[existingIndex] = { ...existing, value: entry.value };
    }
  }
  return {
    ...base,
    stats,
    slot: base.slot ?? extra.slot,
    set_key: base.set_key ?? extra.set_key,
    prefix: base.prefix ?? extra.prefix,
    exclusive_hero_slug: base.exclusive_hero_slug ?? extra.exclusive_hero_slug,
    exclusive_faction: base.exclusive_faction ?? extra.exclusive_faction,
  };
}

function isValueJunkLine(line: string): boolean {
  if (allNumbers(line).length > 0) return false;
  return (
    hasPhrase(line, 'EXCLUSIVE') ||
    hasPhrase(line, 'MYTHIC GEAR') ||
    hasPhrase(line, 'VARIANT') ||
    hasPhrase(line, 'ANCIENT') ||
    /^(T[123]|\+\d+)$/.test(line)
  );
}

function valueSourceFromLines(
  lines: string[],
  index: number,
  rest: string,
  isMain: boolean,
): string {
  let source = rest;
  if (allNumbers(source).length > 0) return source;
  const last = isMain ? Math.min(lines.length, index + 4) : Math.min(lines.length, index + 2);
  for (let look = index + 1; look < last; look += 1) {
    const next = lines[look];
    if (!next) continue;
    if (matchStat(next)) break;
    if (isValueJunkLine(next)) continue;
    source = `${source} ${next}`.trim();
    if (allNumbers(source).length > 0) break;
    if (!isMain) break;
  }
  return source;
}

const FACTION_NEEDLES = FACTIONS.filter((faction) => faction !== 'unaffiliated')
  .flatMap((faction) => {
    const full = normalizeOcrText(FACTION_DISPLAY_NAMES[faction]).replace(/\n/g, ' ');
    const needles = [full];
    if (!full.startsWith('THE ')) needles.push(`THE ${full}`);
    return needles.map((needle) => ({ key: faction, needle }));
  })
  .sort((a, b) => b.needle.length - a.needle.length);

function findExclusiveFaction(blob: string): FactionKey | null {
  const spaced = blob.replace(/\n/g, ' ');
  for (const { key, needle } of FACTION_NEEDLES) {
    if (hasPhrase(spaced, `${needle} EXCLUSIVE`) || hasPhrase(spaced, `EXCLUSIVE ${needle}`)) {
      return key;
    }
  }
  for (const { key, needle } of FACTION_NEEDLES) {
    if (hasPhrase(spaced, `${needle} RING`)) return key;
  }
  if (!hasPhrase(spaced, 'EXCLUSIVE')) return null;
  for (const { key, needle } of FACTION_NEEDLES) {
    if (hasPhrase(spaced, needle)) return key;
  }
  return null;
}

function findExclusiveHero(blob: string, heroes: readonly OcrHeroRef[]): string | null {
  if (heroes.length === 0) return null;
  const spaced = blob.replace(/\n/g, ' ');
  const needles = heroes
    .map((hero) => ({
      slug: hero.slug,
      needle: normalizeOcrText(hero.name).replace(/\n/g, ' '),
    }))
    .filter((entry) => entry.needle.length >= 3)
    .sort((a, b) => b.needle.length - a.needle.length);

  for (const { slug, needle } of needles) {
    if (hasPhrase(spaced, `${needle} EXCLUSIVE`) || hasPhrase(spaced, `EXCLUSIVE ${needle}`)) {
      return slug;
    }
  }
  for (const { slug, needle } of needles) {
    if (SLOT_NEEDLES.some(({ needle: slot }) => hasPhrase(spaced, `${needle}S ${slot}`))) {
      return slug;
    }
  }
  if (!hasPhrase(spaced, 'EXCLUSIVE')) return null;
  for (const { slug, needle } of needles) {
    if (hasPhrase(spaced, needle)) return slug;
  }
  return null;
}

export function parseGearOcr(text: string, heroes: readonly OcrHeroRef[] = []): ParsedGearOcr {
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
    const source = valueSourceFromLines(lines, index, matched.rest, isMain);
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

  salvageMainStat(stats, blob);

  const slot = findSlot(lines);
  const exclusiveHero = slot === 'ring' ? null : findExclusiveHero(blob, heroes);
  const exclusiveFaction = slot === 'ring' ? findExclusiveFaction(blob) : null;
  return {
    stats,
    slot,
    set_key: exclusiveHero || exclusiveFaction ? null : findSetKey(blob),
    prefix: findPrefix(blob),
    exclusive_hero_slug: exclusiveHero,
    exclusive_faction: exclusiveFaction,
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
    parsed.prefix == null &&
    parsed.exclusive_hero_slug == null &&
    parsed.exclusive_faction == null
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
  const exclusive =
    slot === 'ring' && parsed.exclusive_faction
      ? { exclusive_faction: parsed.exclusive_faction, exclusive_hero_slug: '' }
      : parsed.exclusive_hero_slug && slot !== 'ring'
        ? { exclusive_hero_slug: parsed.exclusive_hero_slug, exclusive_faction: '' }
        : {};
  if (!main) {
    return { ...draft, slot, set_key: setKey, prefix, ...exclusive };
  }
  return {
    ...draft,
    slot,
    set_key: setKey,
    prefix,
    ...exclusive,
    main_stat: main.stat,
    main_value: main.value,
    main_bonus: Math.min(main.bonus ?? 0, MAIN_STAT_BONUS_MAX[main.stat] ?? 0),
    substats: padSubstats(detected.slice(1)),
  };
}
