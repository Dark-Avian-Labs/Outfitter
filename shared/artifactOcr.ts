import {
  ARTIFACT_LEVEL_MAX,
  ARTIFACT_LEVEL_MIN,
  isArtifactSecondaryStat,
  promotionFromMaxLevel,
  type ArtifactSecondaryStat,
} from './catalog.js';

export type ArtifactCatalogRef = {
  slug: string;
  name: string;
};

export type ParsedArtifactOcr = {
  catalog_slug: string | null;
  level: number | null;
  promotion: number | null;
  hp_base: number | null;
  hp_bonus: number | null;
  atk_base: number | null;
  atk_bonus: number | null;
  secondary_stat: ArtifactSecondaryStat | null;
  secondary_value: number | null;
};

const SECONDARY_ALIASES: readonly { pattern: string; stat: ArtifactSecondaryStat }[] = [
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
  { pattern: 'CRIT DAMAGE', stat: 'critDmg' },
  { pattern: 'CRIT RATE', stat: 'critRate' },
  { pattern: 'CRIT DMG', stat: 'critDmg' },
];

function normalizeOcrText(text: string): string {
  return text
    .toUpperCase()
    .replace(/\r\n/g, '\n')
    .replace(/[''`´]/g, '')
    .replace(/5PD/g, 'SPD')
    .replace(/\bSP0\b/g, 'SPD')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/[^A-Z0-9.,%+/\n]+/g, ' ')
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

function parseBaseAndBonus(source: string): { base: number; bonus: number } | null {
  const match = source.match(/(\d{1,3}(?:,\d{3})+|\d{2,5})\s*\+\s*(\d{1,3}(?:,\d{3})+|\d{1,5})/);
  if (!match?.[1] || !match[2]) return null;
  const base = parseStatNumber(match[1]);
  const bonus = parseStatNumber(match[2]);
  if (base == null || bonus == null) return null;
  return { base, bonus };
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

function findCatalogSlug(blob: string, catalog: readonly ArtifactCatalogRef[]): string | null {
  const spaced = blob.replace(/\n/g, ' ');
  const needles = catalog
    .map((artifact) => ({
      slug: artifact.slug,
      needle: normalizeOcrText(artifact.name).replace(/\n/g, ' '),
    }))
    .filter((entry) => entry.needle.length >= 3)
    .sort((a, b) => b.needle.length - a.needle.length);
  for (const { slug, needle } of needles) {
    if (hasPhrase(spaced, needle)) return slug;
  }
  return null;
}

function parseLevelAndPromotion(blob: string): { level: number; promotion: number } | null {
  const match = blob.match(/\+\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!match?.[1] || !match[2]) return null;
  const level = Number(match[1]);
  const maxLevel = Number(match[2]);
  if (
    !Number.isInteger(level) ||
    !Number.isInteger(maxLevel) ||
    level < ARTIFACT_LEVEL_MIN ||
    level > ARTIFACT_LEVEL_MAX ||
    maxLevel < ARTIFACT_LEVEL_MIN ||
    maxLevel > ARTIFACT_LEVEL_MAX
  ) {
    return null;
  }
  return { level, promotion: promotionFromMaxLevel(maxLevel) };
}

function lineAfterLabel(line: string, label: 'HP' | 'ATK'): string | null {
  const index = line.indexOf(label);
  if (index < 0) return null;
  const before = index === 0 ? '' : line[index - 1];
  if (before && /[A-Z0-9]/.test(before)) return null;
  const afterIndex = index + label.length;
  const after = afterIndex >= line.length ? '' : line[afterIndex];
  if (after && /[A-Z]/.test(after)) return null;
  const rest = line.slice(afterIndex);
  const trimmed = rest.trim();
  if (
    label === 'ATK' &&
    (trimmed.startsWith('BONUS') || trimmed.startsWith('SPD') || trimmed.startsWith('SPEED'))
  ) {
    return null;
  }
  if (label === 'HP' && rest.trim().startsWith('BONUS')) return null;
  return rest;
}

function parseNamedFlat(
  lines: string[],
  label: 'HP' | 'ATK',
): { base: number; bonus: number } | null {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const rest = lineAfterLabel(line, label);
    if (rest == null) continue;
    const fromLine = parseBaseAndBonus(rest);
    if (fromLine) return fromLine;
    const next = lines[index + 1];
    if (next) {
      const fromNext = parseBaseAndBonus(next);
      if (fromNext) return fromNext;
    }
  }
  return null;
}

function parseSecondary(lines: string[]): {
  stat: ArtifactSecondaryStat;
  value: number;
} | null {
  for (const line of lines) {
    for (const alias of SECONDARY_ALIASES) {
      const index = line.indexOf(alias.pattern);
      if (index < 0) continue;
      const before = index === 0 ? '' : line[index - 1];
      if (before && /[A-Z0-9]/.test(before)) continue;
      const rest = line.slice(index + alias.pattern.length);
      const plus = rest.match(/\+\s*(\d{1,3}(?:[.,]\d{1,2})?)/);
      const raw = plus?.[1] ?? rest.match(/(\d{1,3}(?:[.,]\d{1,2})?)/)?.[1];
      if (!raw) continue;
      const value = parseStatNumber(raw);
      if (value == null) continue;
      return { stat: alias.stat, value };
    }
  }
  return null;
}

export function parseArtifactOcr(
  text: string,
  catalog: readonly ArtifactCatalogRef[] = [],
): ParsedArtifactOcr {
  const normalized = normalizeOcrText(text);
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const blob = lines.join('\n');
  const hp = parseNamedFlat(lines, 'HP');
  const atk = parseNamedFlat(lines, 'ATK');
  const level = parseLevelAndPromotion(blob);
  const secondary = parseSecondary(lines);
  return {
    catalog_slug: findCatalogSlug(blob, catalog),
    level: level?.level ?? null,
    promotion: level?.promotion ?? null,
    hp_base: hp?.base ?? null,
    hp_bonus: hp?.bonus ?? null,
    atk_base: atk?.base ?? null,
    atk_bonus: atk?.bonus ?? null,
    secondary_stat: secondary?.stat ?? null,
    secondary_value: secondary?.value ?? null,
  };
}

export type ArtifactOcrFields = {
  catalog_slug: string;
  level: number;
  promotion: number;
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: ArtifactSecondaryStat | '';
  secondary_value: number;
};

export function applyArtifactOcr<T extends ArtifactOcrFields>(
  draft: T,
  parsed: ParsedArtifactOcr,
): T {
  const next = { ...draft };
  if (parsed.catalog_slug) next.catalog_slug = parsed.catalog_slug;
  if (parsed.level != null) next.level = parsed.level;
  if (parsed.promotion != null) next.promotion = parsed.promotion;
  if (parsed.hp_base != null) next.hp_base = parsed.hp_base;
  if (parsed.hp_bonus != null) next.hp_bonus = parsed.hp_bonus;
  if (parsed.atk_base != null) next.atk_base = parsed.atk_base;
  if (parsed.atk_bonus != null) next.atk_bonus = parsed.atk_bonus;
  if (parsed.secondary_stat && isArtifactSecondaryStat(parsed.secondary_stat)) {
    next.secondary_stat = parsed.secondary_stat;
    next.secondary_value = parsed.secondary_value ?? 0;
  }
  return next;
}
