import {
  CLASS_DISPLAY_NAMES,
  FACTION_DISPLAY_NAMES,
  FACTIONS,
  FILTER_STAR_RARITY_LABELS,
  FILTER_STAR_RATINGS,
  GEAR_SLOTS,
  GEAR_STAT_LABELS,
  HERO_CLASSES,
  SLOT_LABELS,
  type GearSlot,
  formatStatValue,
  gearEmptySlotSrc,
  gearSetBadgeSrc,
  outOfRangeGearLabels,
  trimNumber,
} from '@shared/catalog';
import type { FinalStats } from '@shared/formulas';
import { GEAR_RANKS, KEEP_RULES, rateGear } from '@shared/gearRating';
import { compareInventoryGear } from '@shared/gearSort';
import { SCORE_STAT_KEYS, SCORE_STAT_LABELS, type ScoreStatKey } from '@shared/optimizer';
import { ALL_SETS, LEFT_SETS, RIGHT_SETS, SET_BY_KEY, setsSortedByTier } from '@shared/sets';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { FilterIconButton } from '../../components/ui/FilterIconButton';
import { Modal } from '../../components/ui/Modal';
import {
  cycleTriFilter,
  matchesTriFilter,
  triFilterState,
  type TriFilterMap,
} from '../../lib/triFilter';
import { apiFetch } from '../../utils/api';
import { AccountBar } from './AccountBar';
import { FieldSelect } from './FieldSelect';
import { GearFormModal, type GearDraft } from './GearFormModal';
import { EmptySlotTile, GearTile, StatGauge, gearSubstats, type GearView } from './GearTile';
import { RerollTab } from './RerollTab';
import type { GameAccount, HeroRow, OutfitResult } from './types';
import {
  STAR_ICONS,
  WorIconWithFallback,
  classIconUrls,
  factionIconUrls,
  renderStars,
} from './worIcons';

type Tab = 'gear' | 'reroll' | 'equipment' | 'outfit';

type CalcStreamEvent = {
  progress?: unknown;
  total?: unknown;
  results?: unknown;
  error?: unknown;
};

function outfitResultStats(
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
    { label: 'CD', base: '0', bonus: `+${stats.critDmg.toFixed(1)}%` },
    { label: 'HE', base: '0', bonus: `+${trimNumber(stats.healingEffect)}` },
    { label: 'RR', base: '0', bonus: `+${trimNumber(stats.rageRegen)}%` },
    {
      label: 'RR (Auto)',
      base: trimNumber(hero.rr_auto),
      bonus: `+${trimNumber(stats.rageRegenAuto - hero.rr_auto)}`,
    },
  ];
}

const LOADOUT_LEFT_SLOTS: GearSlot[] = ['weapon', 'armor'];
const LOADOUT_RIGHT_SLOTS: GearSlot[] = ['bangle', 'amulet', 'ring'];

function OutfitStatsList({ stats, hero }: { stats: FinalStats; hero: HeroRow }) {
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

function GearPieceCard({ piece, slot }: { piece: GearView | undefined; slot: GearSlot }) {
  return (
    <div className="gear-piece-card glass-surface">
      <div className="gear-piece-card__head">
        {piece ? <GearTile gear={piece} size={72} /> : <EmptySlotTile slot={slot} size={72} />}
        <div className="gear-piece-card__meta">
          <div className="gear-piece-card__slot">{SLOT_LABELS[slot]}</div>
          {piece ? (
            <div className="gear-piece-card__main">
              {GEAR_STAT_LABELS[piece.main_stat]}{' '}
              {formatStatValue(piece.main_stat, piece.main_value + piece.main_bonus)}
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

function isOutfitResultList(value: unknown): value is OutfitResult[] {
  return Array.isArray(value);
}

async function readOutfitCalculate(
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

export function OutfitterPage() {
  const [tab, setTab] = useState<Tab>('gear');
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number | null>(null);
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [gear, setGear] = useState<GearView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gearFormOpen, setGearFormOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<GearView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [slotFilter, setSlotFilter] = useState<TriFilterMap>({});
  const [setFilter, setSetFilter] = useState('');
  const [mainFilter, setMainFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [ruleFilter, setRuleFilter] = useState('');
  const [classFilter, setClassFilter] = useState<TriFilterMap>({});
  const [factionFilter, setFactionFilter] = useState<TriFilterMap>({});
  const [rarityFilter, setRarityFilter] = useState<TriFilterMap>({});
  const [selectedHero, setSelectedHero] = useState<HeroRow | null>(null);
  const [heroLoadout, setHeroLoadout] = useState<{
    gear: GearView[];
    stats: FinalStats | null;
  } | null>(null);
  const [outfitHero, setOutfitHero] = useState('');
  const [weights, setWeights] = useState<Partial<Record<ScoreStatKey, number>>>({
    atk: 100,
    critDmg: 100,
    atkSpd: 50,
  });
  const [minimums, setMinimums] = useState<Partial<Record<ScoreStatKey, number>>>({ critRate: 95 });
  const [desiredLeft, setDesiredLeft] = useState('');
  const [desiredRight, setDesiredRight] = useState('');
  const [forceSets, setForceSets] = useState(false);
  const [includeEquipped, setIncludeEquipped] = useState(false);
  const [results, setResults] = useState<OutfitResult[]>([]);
  const [calcMessage, setCalcMessage] = useState<string | null>(null);
  const [calcProgress, setCalcProgress] = useState<number | null>(null);
  const [calcSearching, setCalcSearching] = useState(false);
  const [heroDraft, setHeroDraft] = useState<HeroRow | null>(null);

  const loadAccounts = useCallback(async () => {
    const response = await apiFetch('/api/accounts');
    if (!response.ok) throw new Error('Failed to load accounts');
    const body = (await response.json()) as {
      accounts?: GameAccount[];
      current_account_id?: number | null;
    };
    setAccounts(body.accounts ?? []);
    setCurrentAccountId(body.current_account_id ?? null);
    return body.current_account_id ?? null;
  }, []);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const accountId = await loadAccounts();
      if (accountId == null) {
        setHeroes([]);
        setGear([]);
        return;
      }
      const [heroesRes, gearRes] = await Promise.all([
        apiFetch('/api/heroes'),
        apiFetch('/api/gear'),
      ]);
      if (!heroesRes.ok) throw new Error('Failed to load heroes. Import the Codex catalog first.');
      if (!gearRes.ok) throw new Error('Failed to load gear');
      const heroesBody = (await heroesRes.json()) as { heroes?: HeroRow[] };
      const gearBody = (await gearRes.json()) as { gear?: GearView[] };
      setHeroes(heroesBody.heroes ?? []);
      setGear(gearBody.gear ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load');
    }
  }, [loadAccounts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredGear = useMemo(
    () =>
      gear
        .filter((piece) => {
          if (!matchesTriFilter(piece.slot, slotFilter)) return false;
          if (setFilter && piece.set_key !== setFilter) return false;
          if (mainFilter && piece.main_stat !== mainFilter) return false;
          if (subFilter) {
            const stats = [piece.sub1_stat, piece.sub2_stat, piece.sub3_stat, piece.sub4_stat];
            if (!stats.includes(subFilter as GearView['main_stat'])) return false;
          }
          if (ratingFilter || ruleFilter) {
            const rating = rateGear(piece);
            if (ratingFilter && rating.rank !== ratingFilter) return false;
            if (ruleFilter === 'none' && rating.ruleName != null) return false;
            if (ruleFilter && ruleFilter !== 'none' && rating.ruleName !== ruleFilter) return false;
          }
          return true;
        })
        .slice()
        .sort(compareInventoryGear),
    [gear, mainFilter, ratingFilter, ruleFilter, setFilter, slotFilter, subFilter],
  );

  const equippedHeroes = useMemo(() => {
    const slugs = new Set(gear.map((piece) => piece.equipped_hero_slug).filter(Boolean));
    return heroes.filter((hero) => slugs.has(hero.slug));
  }, [gear, heroes]);

  const filteredEquipmentHeroes = useMemo(
    () =>
      equippedHeroes.filter((hero) => {
        if (!matchesTriFilter(hero.class, classFilter)) return false;
        if (
          !matchesTriFilter(hero.faction, factionFilter) &&
          !matchesTriFilter(hero.faction_secondary, factionFilter)
        ) {
          return false;
        }
        if (!matchesTriFilter(String(hero.star_rating), rarityFilter)) return false;
        return true;
      }),
    [classFilter, equippedHeroes, factionFilter, rarityFilter],
  );

  const equippedGearByHero = useMemo(() => {
    const map = new Map<string, Partial<Record<GearSlot, GearView>>>();
    for (const piece of gear) {
      const slug = piece.equipped_hero_slug;
      if (!slug) continue;
      const slots = map.get(slug) ?? {};
      slots[piece.slot] = piece;
      map.set(slug, slots);
    }
    return map;
  }, [gear]);

  async function saveGear(draft: GearDraft): Promise<void> {
    setFormError(null);
    const payload = {
      ...draft,
      exclusive_hero_slug: draft.exclusive_hero_slug || null,
      exclusive_faction: draft.exclusive_faction || null,
    };
    const response = await apiFetch(editingGear ? `/api/gear/${editingGear.id}` : '/api/gear', {
      method: editingGear ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(body?.error ?? 'Could not save gear');
      return;
    }
    setGearFormOpen(false);
    setEditingGear(null);
    await reload();
  }

  async function deleteGear(): Promise<void> {
    if (!editingGear) return;
    const response = await apiFetch(`/api/gear/${editingGear.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setFormError('Could not delete gear');
      return;
    }
    setGearFormOpen(false);
    setEditingGear(null);
    await reload();
  }

  async function openHero(hero: HeroRow): Promise<void> {
    setSelectedHero(hero);
    setHeroLoadout(null);
    const response = await apiFetch(`/api/heroes/${hero.slug}/loadout`);
    if (!response.ok) return;
    const body = (await response.json()) as {
      gear?: GearView[];
      stats?: FinalStats | null;
    };
    setHeroLoadout({ gear: body.gear ?? [], stats: body.stats ?? null });
  }

  async function saveHeroStats(): Promise<void> {
    if (!heroDraft) return;
    await apiFetch(`/api/heroes/${heroDraft.slug}/stats`, {
      method: 'PATCH',
      body: JSON.stringify({
        hp: heroDraft.hp,
        atk: heroDraft.atk,
        def: heroDraft.def,
        atk_interval: heroDraft.atk_interval,
        rr_auto: heroDraft.rr_auto,
        rr_attack: heroDraft.rr_attack,
        rr_attacked: heroDraft.rr_attacked,
      }),
    });
    await reload();
  }

  async function calculate(): Promise<void> {
    if (!outfitHero || calcProgress != null) return;
    setCalcMessage(null);
    setResults([]);
    setCalcProgress(0);
    setCalcSearching(false);
    try {
      const response = await apiFetch('/api/outfit/calculate', {
        method: 'POST',
        body: JSON.stringify({
          hero_slug: outfitHero,
          weights,
          minimums,
          desired_left_set: desiredLeft || null,
          desired_right_set: desiredRight || null,
          force_sets: forceSets,
          include_equipped: includeEquipped,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setCalcMessage(body?.error ?? 'Calculate failed');
        return;
      }
      const { results: next, error } = await readOutfitCalculate(response, (done, total) => {
        setCalcSearching(true);
        setCalcProgress(total > 0 ? done / total : 1);
      });
      if (error) {
        setCalcMessage(error);
        return;
      }
      setResults(next);
      if (next.length === 0) {
        setCalcMessage('No loadout matches. Relax mins, turn off Force sets, or add more gear.');
      }
    } catch {
      setCalcMessage('Calculate failed');
    } finally {
      setCalcProgress(null);
      setCalcSearching(false);
    }
  }

  async function saveResult(result: OutfitResult): Promise<void> {
    const response = await apiFetch('/api/outfit/save', {
      method: 'POST',
      body: JSON.stringify({
        hero_slug: outfitHero,
        piece_ids: result.pieces.map((piece) => piece.id),
      }),
    });
    if (!response.ok) {
      setCalcMessage('Could not save loadout. A piece may already be equipped.');
      return;
    }
    setCalcMessage('Saved to Equipment.');
    await reload();
  }

  const outfitHeroRow = heroes.find((hero) => hero.slug === outfitHero) ?? null;

  useEffect(() => {
    setHeroDraft(outfitHeroRow);
  }, [outfitHeroRow]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['gear', 'reroll', 'equipment', 'outfit'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`header-link ${tab === item ? 'active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <AccountBar accounts={accounts} currentId={currentAccountId} onChange={reload} />
      </div>

      {loadError ? <p className="mb-4 text-sm text-[var(--color-danger)]">{loadError}</p> : null}
      {accounts.length === 0 ? (
        <p className="text-muted text-sm">Create an account to store gear.</p>
      ) : null}

      {tab === 'gear' ? (
        <>
          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-label">Type:</span>
              {GEAR_SLOTS.map((slot) => (
                <FilterIconButton
                  key={slot}
                  state={triFilterState(slotFilter, slot)}
                  label={SLOT_LABELS[slot]}
                  onClick={() => setSlotFilter((previous) => cycleTriFilter(previous, slot))}
                >
                  <img src={gearEmptySlotSrc(slot)} alt="" />
                </FilterIconButton>
              ))}
            </div>
            <FieldSelect
              className="min-w-[12rem]"
              label="Set"
              inline
              value={setFilter}
              options={[
                { value: '', label: 'All sets' },
                ...setsSortedByTier(ALL_SETS).map((set) => ({
                  value: set.key,
                  label: set.name,
                  iconSrc: gearSetBadgeSrc(set.key),
                })),
              ]}
              onChange={setSetFilter}
            />
            <FieldSelect
              className="min-w-[12rem]"
              label="Main"
              inline
              value={mainFilter}
              options={[
                { value: '', label: 'Any main' },
                ...Object.entries(GEAR_STAT_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              onChange={setMainFilter}
            />
            <FieldSelect
              className="min-w-[12rem]"
              label="Sub"
              inline
              value={subFilter}
              options={[
                { value: '', label: 'Any sub' },
                ...Object.entries(GEAR_STAT_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              onChange={setSubFilter}
            />
            <FieldSelect
              className="min-w-[8rem]"
              label="Rating"
              inline
              value={ratingFilter}
              options={[
                { value: '', label: 'All' },
                ...GEAR_RANKS.map((rank) => ({ value: rank, label: rank })),
              ]}
              onChange={setRatingFilter}
            />
            <FieldSelect
              className="min-w-[16rem]"
              label="Rule"
              inline
              value={ruleFilter}
              options={[
                { value: '', label: 'All rules' },
                { value: 'none', label: 'No rule' },
                ...KEEP_RULES.map((rule) => ({ value: rule.name, label: rule.name })),
              ]}
              onChange={setRuleFilter}
            />
            <div className="stats-bar-actions ml-auto">
              <button
                type="button"
                className="stats-bar-toggle"
                onClick={() => {
                  setEditingGear(null);
                  setFormError(null);
                  setGearFormOpen(true);
                }}
              >
                + Add
              </button>
            </div>
          </div>
          <div className="table-container">
            <div className="table-scroll">
              <table className="gear-table">
                <colgroup>
                  <col className="col-icon" />
                  <col className="col-type" />
                  <col className="col-set" />
                  <col className="col-main" />
                  <col className="col-stats" />
                  <col className="col-rating" />
                  <col className="col-equipped" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="col-icon" />
                    <th className="col-type">Type</th>
                    <th className="col-set">Set</th>
                    <th className="col-main">Main</th>
                    <th className="stats-col">Stats</th>
                    <th className="col-rating">Rating</th>
                    <th className="col-equipped">Equipped</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGear.map((piece) => {
                    const setName = SET_BY_KEY[piece.set_key]?.name ?? piece.set_key;
                    const mainLabel = `${GEAR_STAT_LABELS[piece.main_stat]} ${formatStatValue(
                      piece.main_stat,
                      piece.main_value + piece.main_bonus,
                    )}`;
                    const illegalLabels = outOfRangeGearLabels(piece);
                    const rating = rateGear(piece);
                    return (
                      <tr
                        key={piece.id}
                        className={`cursor-pointer${illegalLabels.length > 0 ? ' gear-row--illegal' : ''}`}
                        title={
                          illegalLabels.length > 0
                            ? `Out of range: ${illegalLabels.join(', ')}`
                            : undefined
                        }
                        onClick={() => {
                          setEditingGear(piece);
                          setFormError(null);
                          setGearFormOpen(true);
                        }}
                      >
                        <td className="col-icon">
                          <GearTile gear={piece} size={40} />
                        </td>
                        <td className="col-type">{SLOT_LABELS[piece.slot]}</td>
                        <td className="col-set" title={setName}>
                          {setName}
                        </td>
                        <td className="col-main" title={mainLabel}>
                          {mainLabel}
                        </td>
                        <td className="stats-col">
                          <div className="flex flex-col gap-1">
                            {gearSubstats(piece).map((entry, index) => (
                              <StatGauge
                                key={`${piece.id}-${index}`}
                                stat={entry.stat}
                                value={entry.value}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="col-rating">
                          <div className="gear-rating">
                            <span className="gear-rating__rank" data-rank={rating.rank}>
                              {rating.rank}
                            </span>
                            <span className="gear-rating__fit" title={rating.ruleName ?? undefined}>
                              {rating.ruleName ?? '-'}
                            </span>
                          </div>
                        </td>
                        <td className="col-equipped">
                          {piece.equipped_hero_portrait ? (
                            <img
                              className="gear-table__hero"
                              src={piece.equipped_hero_portrait}
                              alt=""
                              title={piece.equipped_hero_name ?? undefined}
                            />
                          ) : (
                            <span title={piece.equipped_hero_name ?? undefined}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'reroll' ? (
        <RerollTab
          gear={gear}
          onOpenGear={(piece) => {
            setEditingGear(piece);
            setFormError(null);
            setGearFormOpen(true);
          }}
        />
      ) : null}

      {tab === 'equipment' ? (
        <>
          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-label">Class:</span>
              {HERO_CLASSES.map((heroClass) => (
                <FilterIconButton
                  key={heroClass}
                  state={triFilterState(classFilter, heroClass)}
                  label={CLASS_DISPLAY_NAMES[heroClass]}
                  onClick={() => setClassFilter((previous) => cycleTriFilter(previous, heroClass))}
                >
                  <WorIconWithFallback
                    className="invert-on-light"
                    primarySrc={classIconUrls(heroClass).primary}
                    fallbackSrc={classIconUrls(heroClass).fallback}
                    alt={CLASS_DISPLAY_NAMES[heroClass]}
                    size={24}
                  />
                </FilterIconButton>
              ))}
            </div>
            <div className="filter-group">
              <span className="filter-label">Rarity:</span>
              {FILTER_STAR_RATINGS.map((stars) => {
                const iconSrc = STAR_ICONS[`star${stars}`];
                return (
                  <FilterIconButton
                    key={stars}
                    state={triFilterState(rarityFilter, String(stars))}
                    label={`${FILTER_STAR_RARITY_LABELS[stars]} rarity`}
                    onClick={() =>
                      setRarityFilter((previous) => cycleTriFilter(previous, String(stars)))
                    }
                  >
                    {iconSrc ? (
                      <img src={iconSrc} alt={`${stars} star`} width={24} height={24} />
                    ) : (
                      <span aria-hidden="true">{stars}★</span>
                    )}
                  </FilterIconButton>
                );
              })}
            </div>
            <div className="filter-group">
              <span className="filter-label">Faction:</span>
              {FACTIONS.filter((faction) => faction !== 'unaffiliated').map((faction) => (
                <FilterIconButton
                  key={faction}
                  state={triFilterState(factionFilter, faction)}
                  label={FACTION_DISPLAY_NAMES[faction]}
                  onClick={() => setFactionFilter((previous) => cycleTriFilter(previous, faction))}
                >
                  <WorIconWithFallback
                    className="invert-on-light"
                    primarySrc={factionIconUrls(faction).primary}
                    fallbackSrc={factionIconUrls(faction).fallback}
                    alt={FACTION_DISPLAY_NAMES[faction]}
                    size={24}
                  />
                </FilterIconButton>
              ))}
            </div>
          </div>
          <div className="table-container">
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEquipmentHeroes.map((hero) => {
                const loadout = equippedGearByHero.get(hero.slug);
                return (
                  <article
                    key={hero.slug}
                    className="equipment-hero-card"
                    tabIndex={0}
                    onClick={() => void openHero(hero)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      void openHero(hero);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {hero.portrait_path ? (
                        <img
                          src={hero.portrait_path}
                          alt=""
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : null}
                      <div>
                        <div className="flex items-center gap-2">
                          {renderStars(hero.star_rating, hero.is_lord ? 'star6' : undefined)}
                          <div className="font-semibold">{hero.name}</div>
                        </div>
                        <div className="text-muted text-xs">
                          {CLASS_DISPLAY_NAMES[hero.class]} · {FACTION_DISPLAY_NAMES[hero.faction]}
                        </div>
                      </div>
                    </div>
                    <div className="equipment-hero-card__gear">
                      {GEAR_SLOTS.map((slot) => {
                        const piece = loadout?.[slot];
                        return piece ? (
                          <GearTile
                            key={slot}
                            gear={piece}
                            size={48}
                            showEquipped={false}
                            hover={false}
                          />
                        ) : (
                          <EmptySlotTile key={slot} slot={slot} size={48} />
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
            {filteredEquipmentHeroes.length === 0 ? (
              <p className="text-muted px-4 pb-4 text-sm">
                No saved loadouts yet. Calculate one on the Outfit tab.
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {tab === 'outfit' ? (
        <div className="table-container p-4">
          <div className="grid gap-6 lg:grid-cols-[28rem_1fr]">
            <div className="min-w-0">
              <FieldSelect
                className="w-full min-w-0"
                label="Hero"
                value={outfitHero}
                options={[
                  { value: '', label: 'Select hero' },
                  ...heroes.map((hero) => ({ value: hero.slug, label: hero.name })),
                ]}
                onChange={setOutfitHero}
              />
              {heroDraft ? (
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      ['hp', 'HP'],
                      ['atk', 'ATK'],
                      ['def', 'DEF'],
                      ['atk_interval', 'Interval'],
                      ['rr_auto', 'RR Auto'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="form-group block">
                      <span>{label}</span>
                      <input
                        className="form-input mt-1 w-full"
                        type="number"
                        value={heroDraft[key]}
                        onChange={(event) =>
                          setHeroDraft({ ...heroDraft, [key]: Number(event.target.value) })
                        }
                        onBlur={() => void saveHeroStats()}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <FieldSelect
                  className="min-w-0"
                  label="Left set"
                  value={desiredLeft}
                  options={[
                    { value: '', label: 'Any' },
                    ...setsSortedByTier(LEFT_SETS).map((set) => ({
                      value: set.key,
                      label: set.name,
                      iconSrc: gearSetBadgeSrc(set.key),
                    })),
                  ]}
                  onChange={setDesiredLeft}
                />
                <FieldSelect
                  className="min-w-0"
                  label="Right set"
                  value={desiredRight}
                  options={[
                    { value: '', label: 'Any' },
                    ...setsSortedByTier(RIGHT_SETS).map((set) => ({
                      value: set.key,
                      label: set.name,
                      iconSrc: gearSetBadgeSrc(set.key),
                    })),
                  ]}
                  onChange={setDesiredRight}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={forceSets}
                  onChange={(event) => setForceSets(event.target.checked)}
                />
                Force sets only
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeEquipped}
                  onChange={(event) => setIncludeEquipped(event.target.checked)}
                />
                Include this hero's equipped gear
              </label>
              <h3 className="mt-5 text-sm font-semibold">Weights</h3>
              {SCORE_STAT_KEYS.map((key) => (
                <label key={key} className="mt-2 block text-xs">
                  <span className="text-muted flex justify-between">
                    {SCORE_STAT_LABELS[key]}
                    <span>{weights[key] ?? 0}</span>
                  </span>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={100}
                    value={weights[key] ?? 0}
                    onChange={(event) =>
                      setWeights({ ...weights, [key]: Number(event.target.value) })
                    }
                  />
                </label>
              ))}
              <h3 className="mt-5 text-sm font-semibold">Minimums (final stats)</h3>
              {SCORE_STAT_KEYS.map((key) => (
                <label key={key} className="form-group mt-2 block text-sm">
                  <span>{SCORE_STAT_LABELS[key]}</span>
                  <input
                    className="form-input mt-1 w-full"
                    type="number"
                    value={minimums[key] ?? ''}
                    onChange={(event) => {
                      const next = { ...minimums };
                      if (event.target.value === '') delete next[key];
                      else next[key] = Number(event.target.value);
                      setMinimums(next);
                    }}
                  />
                </label>
              ))}
              <Button
                className="mt-4 w-full"
                variant="accent"
                disabled={!outfitHero || calcProgress != null}
                onClick={() => void calculate()}
              >
                Calculate
              </Button>
            </div>
            <div>
              {calcMessage ? <p className="text-muted mb-3 text-sm">{calcMessage}</p> : null}
              <div className="grid gap-4">
                {results.map((result, index) => (
                  <section key={index} className="rounded-[var(--radius-ui)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">Result {index + 1}</h3>
                      <Button variant="accent" onClick={() => void saveResult(result)}>
                        Save
                      </Button>
                    </div>
                    <div className="outfit-result-body">
                      {outfitHeroRow ? (
                        <OutfitStatsList stats={result.stats} hero={outfitHeroRow} />
                      ) : null}
                      <div className="outfit-result-gear">
                        {result.pieces.map((piece) => {
                          const full = gear.find((row) => row.id === piece.id);
                          return full ? <GearTile key={piece.id} gear={full} /> : null;
                        })}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <GearFormModal
        open={gearFormOpen}
        gear={editingGear}
        existingGear={gear}
        heroes={heroes}
        error={formError}
        onClose={() => setGearFormOpen(false)}
        onSave={saveGear}
        onDelete={editingGear ? deleteGear : undefined}
      />

      <Modal
        open={selectedHero != null}
        onClose={() => setSelectedHero(null)}
        className="glass-modal-surface max-w-5xl"
      >
        {selectedHero ? (
          <>
            <h2>{selectedHero.name}</h2>
            <div className="equipment-loadout">
              <div className="equipment-loadout__col">
                {LOADOUT_LEFT_SLOTS.map((slot) => (
                  <GearPieceCard
                    key={slot}
                    slot={slot}
                    piece={heroLoadout?.gear.find((row) => row.slot === slot)}
                  />
                ))}
              </div>
              <div className="equipment-loadout-stats glass-surface">
                {heroLoadout?.stats ? (
                  <OutfitStatsList stats={heroLoadout.stats} hero={selectedHero} />
                ) : (
                  <p className="text-muted text-sm">No stats yet.</p>
                )}
              </div>
              <div className="equipment-loadout__col">
                {LOADOUT_RIGHT_SLOTS.map((slot) => (
                  <GearPieceCard
                    key={slot}
                    slot={slot}
                    piece={heroLoadout?.gear.find((row) => row.slot === slot)}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="cancel" onClick={() => setSelectedHero(null)}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
      <Modal
        open={calcProgress != null}
        onClose={() => undefined}
        className="glass-modal-surface max-w-md"
        ariaLabelledBy="outfit-calc-title"
      >
        <h2 id="outfit-calc-title">Calculating</h2>
        <p className="text-muted mt-2 text-sm">
          {calcSearching
            ? `Searching loadouts… ${Math.round((calcProgress ?? 0) * 100)}%`
            : 'Preparing inventory…'}
        </p>
        <div
          className="outfit-calc-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((calcProgress ?? 0) * 100)}
        >
          {calcSearching ? (
            <div
              className="outfit-calc-progress__fill"
              style={{ width: `${Math.max(Math.round((calcProgress ?? 0) * 100), 4)}%` }}
            />
          ) : (
            <div className="outfit-calc-progress__fill outfit-calc-progress__fill--busy" />
          )}
        </div>
      </Modal>
    </div>
  );
}
