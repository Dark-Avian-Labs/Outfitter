import {
  GEAR_SLOTS,
  GEAR_STAT_KEYS,
  SLOT_MAIN_STATS,
  type GearSlot,
  type GearStatKey,
} from './catalog.js';
import { setsForSlot } from './sets.js';

export type DetectedGearStat = {
  stat: GearStatKey;
  value: number;
};

export type OcrGearFields = {
  slot: GearSlot;
  set_key: string;
  main_stat: GearStatKey;
  main_value: number;
  main_bonus: number;
  substats: { stat: GearStatKey; value: number }[];
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
  { pattern: 'ATK SPEED', stat: 'atkSpd' },
  { pattern: 'ATK SPD', stat: 'atkSpd' },
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
    .replace(/\.(?!\d)/g, ' ')
    .replace(/[^A-Z0-9.,%\n]+/g, ' ')
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

function firstNumber(text: string): number | null {
  const match = text.match(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,5}(?:[.,]\d{1,2})?)/);
  if (!match?.[1]) return null;
  return parseStatNumber(match[1]);
}

function matchStat(line: string): { stat: GearStatKey; rest: string } | null {
  for (const alias of STAT_ALIASES) {
    const index = line.indexOf(alias.pattern);
    if (index < 0) continue;
    const before = index === 0 ? '' : line[index - 1];
    if (before && /[A-Z0-9]/.test(before)) continue;
    const afterIndex = index + alias.pattern.length;
    const after = afterIndex >= line.length ? '' : line[afterIndex];
    if (after && /[A-Z0-9]/.test(after)) continue;
    return { stat: alias.stat, rest: line.slice(afterIndex) };
  }
  return null;
}

export function parseGearOcrText(text: string): DetectedGearStat[] {
  const lines = normalizeOcrText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const detected: DetectedGearStat[] = [];
  const seen = new Set<GearStatKey>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const matched = matchStat(line);
    if (!matched) continue;
    let value = firstNumber(matched.rest);
    if (value == null) {
      const next = lines[index + 1];
      if (next && !matchStat(next)) value = firstNumber(next);
    }
    if (value == null || seen.has(matched.stat)) continue;
    seen.add(matched.stat);
    detected.push({ stat: matched.stat, value });
  }

  return detected;
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

export function applyOcrStats<T extends OcrGearFields>(draft: T, detected: DetectedGearStat[]): T {
  if (detected.length === 0) return draft;
  const [main, ...rest] = detected;
  if (!main) return draft;
  const slot = slotForMainStat(main.stat, draft.slot);
  const sets = setsForSlot(slot);
  const setKey = sets.some((set) => set.key === draft.set_key)
    ? draft.set_key
    : (sets[0]?.key ?? draft.set_key);
  return {
    ...draft,
    slot,
    set_key: setKey,
    main_stat: main.stat,
    main_value: main.value,
    main_bonus: 0,
    substats: padSubstats(rest),
  };
}
