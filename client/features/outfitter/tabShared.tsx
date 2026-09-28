import {
  ARTIFACT_PROMOTION_MAX,
  GEAR_STAT_LABELS,
  SLOT_LABELS,
  artifactRarityColor,
  formatStatValue,
  outOfRangeArtifactLabels,
  trimNumber,
  type GearSlot,
} from '@shared/catalog';
import { BASE_CRIT_DMG, type FinalStats } from '@shared/formulas';
import { type GearPieceInput } from '@shared/pieceStats';

import {
  EmptySlotTile,
  GearMainStat,
  GearTile,
  StatGauge,
  gearSubstats,
  type GearView,
} from './GearTile';
import type { ArtifactView, HeroRow, OutfitResult } from './types';

export function outfitResultStats(
  stats: FinalStats,
  hero: HeroRow,
): Array<{ label: string; base: string; bonus: string }> {
  return [
    { label: 'HP', base: String(Math.round(hero.hp)), bonus: `+${Math.round(stats.hpGear)}` },
    { label: 'ATK', base: String(Math.round(hero.atk)), bonus: `+${Math.round(stats.atkGear)}` },
    { label: 'DEF', base: String(Math.round(hero.def)), bonus: `+${Math.round(stats.defGear)}` },
    {
      label: 'AS',
      base: String(Math.round(stats.atkSpd - stats.atkSpdGear)),
      bonus: `+${Math.round(stats.atkSpdGear)}`,
    },
    { label: 'CC', base: '0', bonus: `+${stats.critRate.toFixed(1)}%` },
    { label: 'CD', base: `${BASE_CRIT_DMG}%`, bonus: `+${stats.critDmg.toFixed(1)}%` },
    { label: 'HE', base: '0', bonus: `+${trimNumber(stats.healingEffect)}` },
    { label: 'RR', base: '0', bonus: `+${trimNumber(stats.rageRegen)}%` },
    {
      label: 'RR (Auto)',
      base: trimNumber(hero.rr_auto),
      bonus: `+${trimNumber(stats.rageRegenAuto - hero.rr_auto)}`,
    },
  ];
}

export const LOADOUT_LEFT_SLOTS: GearSlot[] = ['weapon', 'armor'];
export const LOADOUT_RIGHT_SLOTS: GearSlot[] = ['bangle', 'amulet', 'ring'];

export function OutfitStatsList({ stats, hero }: { stats: FinalStats; hero: HeroRow }) {
  return (
    <dl className="outfit-result-stats">
      {outfitResultStats(stats, hero).map((entry) => (
        <div key={entry.label} className="outfit-result-stats__row">
          <dt>{entry.label}</dt>
          <dd>
            <span className="outfit-result-stats__base">{entry.base}</span>
            <span className="outfit-result-stats__bonus">{entry.bonus}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function GearPieceCard({ piece, slot }: { piece: GearView | undefined; slot: GearSlot }) {
  return (
    <div className="gear-piece-card glass-surface">
      <div className="gear-piece-card__head">
        {piece ? <GearTile gear={piece} size={72} /> : <EmptySlotTile slot={slot} size={72} />}
        <div className="gear-piece-card__meta">
          <div className="gear-piece-card__slot">{SLOT_LABELS[slot]}</div>
          {piece ? (
            <div className="gear-piece-card__main">
              <GearMainStat
                stat={piece.main_stat}
                value={piece.main_value}
                bonus={piece.main_bonus}
              />
            </div>
          ) : (
            <div className="text-muted text-xs">Empty</div>
          )}
        </div>
      </div>
      {piece ? (
        <div className="gear-piece-card__gauges">
          {gearSubstats(piece).map((entry, index) => (
            <StatGauge key={`${piece.id}-${index}`} stat={entry.stat} value={entry.value} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function gearToPieceInput(row: GearView): GearPieceInput {
  return {
    id: row.id,
    slot: row.slot,
    setKey: row.set_key,
    mainStat: row.main_stat,
    mainValue: row.main_value,
    mainBonus: row.main_bonus,
    substats: gearSubstats(row),
    equippedHeroSlug: row.equipped_hero_slug,
  };
}

export function heroBase(hero: HeroRow) {
  return {
    hp: hero.hp,
    atk: hero.atk,
    def: hero.def,
    atkInterval: hero.atk_interval,
    rrAuto: hero.rr_auto,
    rrAttack: hero.rr_attack,
    rrAttacked: hero.rr_attacked,
  };
}

const ARTIFACT_PIP_DIP = [0, 0.36, 0.72, 0.36, 0] as const;

export function ArtifactPortrait({
  src,
  size,
  title,
  promotion = 0,
  rarity = '',
  starRating = 0,
}: {
  src: string | null;
  size: number;
  title?: string;
  promotion?: number;
  rarity?: string;
  starRating?: number;
}) {
  const filled = Math.max(0, Math.min(ARTIFACT_PROMOTION_MAX, Math.trunc(promotion)));
  const pip = Math.max(5, Math.floor((size - 2) / 5));
  const color = artifactRarityColor(rarity, starRating);
  return (
    <div
      className="gear-tile gear-tile--artifact"
      style={{ width: size, height: size }}
      title={title}
    >
      <div className="gear-tile__clip">
        {src ? <img className="gear-tile__art" src={src} alt="" /> : null}
      </div>
      <div className="artifact-pips" style={{ fontSize: pip, color }} aria-hidden>
        {ARTIFACT_PIP_DIP.map((dip, index) => (
          <span
            key={index}
            className={`artifact-pip${index < filled ? ' is-filled' : ''}`}
            style={{ transform: `translateY(${dip * pip}px)` }}
          >
            <span className="artifact-pip__facet" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function artifactStatLines(
  row: ArtifactView,
): Array<{ key: string; text: string; illegal: boolean }> {
  const illegal = new Set(outOfRangeArtifactLabels(row));
  const lines = [
    {
      key: 'hp',
      text: `HP ${row.hp_base}${row.hp_bonus > 0 ? `+${row.hp_bonus}` : ''}`,
      illegal: illegal.has('HP') || illegal.has('HP bonus'),
    },
    {
      key: 'atk',
      text: `ATK ${row.atk_base}${row.atk_bonus > 0 ? `+${row.atk_bonus}` : ''}`,
      illegal: illegal.has('ATK') || illegal.has('ATK bonus'),
    },
  ];
  if (row.secondary_stat && row.secondary_value != null) {
    lines.push({
      key: 'secondary',
      text: `${GEAR_STAT_LABELS[row.secondary_stat]} ${formatStatValue(row.secondary_stat, row.secondary_value)}`,
      illegal: illegal.has(GEAR_STAT_LABELS[row.secondary_stat]),
    });
  }
  return lines;
}

export function isOutfitResultList(value: unknown): value is OutfitResult[] {
  return Array.isArray(value);
}

type CalcStreamEvent = {
  progress?: unknown;
  total?: unknown;
  results?: unknown;
  error?: unknown;
};

export async function readOutfitCalculate(
  response: Response,
  onProgress: (done: number, total: number) => void,
): Promise<{ results: OutfitResult[]; error?: string }> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('ndjson') || !response.body) {
    const body = (await response.json().catch(() => null)) as {
      results?: OutfitResult[];
      error?: string;
    } | null;
    return { results: body?.results ?? [], error: body?.error };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let results: OutfitResult[] = [];
  let error: string | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: CalcStreamEvent;
      try {
        event = JSON.parse(trimmed) as CalcStreamEvent;
      } catch {
        continue;
      }
      if (typeof event.progress === 'number' && typeof event.total === 'number') {
        onProgress(event.progress, event.total);
      }
      if (isOutfitResultList(event.results)) results = event.results;
      if (typeof event.error === 'string') error = event.error;
    }
  }
  return { results, error };
}
