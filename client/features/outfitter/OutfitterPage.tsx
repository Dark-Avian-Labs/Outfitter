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
  formatStatValue,
  gearEmptySlotSrc,
} from '@shared/catalog';
import { SCORE_STAT_KEYS, SCORE_STAT_LABELS, type ScoreStatKey } from '@shared/optimizer';
import { LEFT_SETS, RIGHT_SETS, SET_BY_KEY } from '@shared/sets';
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
import { EmptySlotTile, GearTile, StatGauge, type GearView } from './GearTile';
import type { GameAccount, HeroRow, OutfitResult } from './types';
import {
  STAR_ICONS,
  WorIconWithFallback,
  classIconUrls,
  factionIconUrls,
  renderStars,
} from './worIcons';

type Tab = 'gear' | 'equipment' | 'outfit';

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
  const [classFilter, setClassFilter] = useState<TriFilterMap>({});
  const [factionFilter, setFactionFilter] = useState<TriFilterMap>({});
  const [rarityFilter, setRarityFilter] = useState<TriFilterMap>({});
  const [selectedHero, setSelectedHero] = useState<HeroRow | null>(null);
  const [heroLoadout, setHeroLoadout] = useState<{
    gear: GearView[];
    stats: Record<string, number> | null;
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
      gear.filter((piece) => {
        if (!matchesTriFilter(piece.slot, slotFilter)) return false;
        if (setFilter && piece.set_key !== setFilter) return false;
        if (mainFilter && piece.main_stat !== mainFilter) return false;
        if (subFilter) {
          const stats = [piece.sub1_stat, piece.sub2_stat, piece.sub3_stat, piece.sub4_stat];
          if (!stats.includes(subFilter as GearView['main_stat'])) return false;
        }
        return true;
      }),
    [gear, mainFilter, setFilter, slotFilter, subFilter],
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
      stats?: Record<string, number> | null;
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
    setCalcMessage(null);
    setResults([]);
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
    const body = (await response.json().catch(() => null)) as {
      results?: OutfitResult[];
      error?: string;
    } | null;
    if (!response.ok) {
      setCalcMessage(body?.error ?? 'Calculate failed');
      return;
    }
    const next = body?.results ?? [];
    setResults(next);
    if (next.length === 0)
      setCalcMessage('No loadout matches. Relax mins, turn off Force sets, or add more gear.');
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
          {(['gear', 'equipment', 'outfit'] as const).map((item) => (
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
              value={setFilter}
              options={[
                { value: '', label: 'All sets' },
                ...Object.values(SET_BY_KEY).map((set) => ({ value: set.key, label: set.name })),
              ]}
              onChange={setSetFilter}
            />
            <FieldSelect
              className="min-w-[12rem]"
              label="Main"
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
              value={subFilter}
              options={[
                { value: '', label: 'Any sub' },
                ...Object.entries(GEAR_STAT_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              onChange={setSubFilter}
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
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th />
                  <th>Type</th>
                  <th>Set</th>
                  <th>Main</th>
                  <th>Stats</th>
                  <th>Equipped</th>
                </tr>
              </thead>
              <tbody>
                {filteredGear.map((piece) => (
                  <tr
                    key={piece.id}
                    className="cursor-pointer border-t border-[var(--color-glass-divider)] hover:bg-[var(--color-glass-hover)]"
                    onClick={() => {
                      setEditingGear(piece);
                      setFormError(null);
                      setGearFormOpen(true);
                    }}
                  >
                    <td className="py-2">
                      <GearTile gear={piece} size={56} />
                    </td>
                    <td>{SLOT_LABELS[piece.slot]}</td>
                    <td>{SET_BY_KEY[piece.set_key]?.name ?? piece.set_key}</td>
                    <td>
                      {GEAR_STAT_LABELS[piece.main_stat]}{' '}
                      {formatStatValue(piece.main_stat, piece.main_value + piece.main_bonus)}
                    </td>
                    <td className="py-2">
                      <div className="flex min-w-[16rem] flex-col gap-1">
                        {[
                          piece.sub1_stat && piece.sub1_value != null
                            ? { stat: piece.sub1_stat, value: piece.sub1_value }
                            : null,
                          piece.sub2_stat && piece.sub2_value != null
                            ? { stat: piece.sub2_stat, value: piece.sub2_value }
                            : null,
                          piece.sub3_stat && piece.sub3_value != null
                            ? { stat: piece.sub3_stat, value: piece.sub3_value }
                            : null,
                          piece.sub4_stat && piece.sub4_value != null
                            ? { stat: piece.sub4_stat, value: piece.sub4_value }
                            : null,
                        ]
                          .filter(
                            (entry): entry is { stat: GearView['main_stat']; value: number } =>
                              entry != null,
                          )
                          .map((entry, index) => (
                            <StatGauge
                              key={`${piece.id}-${index}`}
                              stat={entry.stat}
                              value={entry.value}
                            />
                          ))}
                      </div>
                    </td>
                    <td>{piece.equipped_hero_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEquipmentHeroes.map((hero) => (
              <button
                key={hero.slug}
                type="button"
                className="glass-surface p-4 text-left"
                onClick={() => void openHero(hero)}
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
              </button>
            ))}
          </div>
          {filteredEquipmentHeroes.length === 0 ? (
            <p className="text-muted mt-4 text-sm">
              No saved loadouts yet. Calculate one on the Outfit tab.
            </p>
          ) : null}
        </>
      ) : null}

      {tab === 'outfit' ? (
        <div className="grid gap-6 lg:grid-cols-[28rem_1fr]">
          <div className="glass-surface min-w-0 p-4">
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
                  ...LEFT_SETS.map((set) => ({ value: set.key, label: set.name })),
                ]}
                onChange={setDesiredLeft}
              />
              <FieldSelect
                className="min-w-0"
                label="Right set"
                value={desiredRight}
                options={[
                  { value: '', label: 'Any' },
                  ...RIGHT_SETS.map((set) => ({ value: set.key, label: set.name })),
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
              disabled={!outfitHero}
              onClick={() => void calculate()}
            >
              Calculate
            </Button>
          </div>
          <div>
            {calcMessage ? <p className="text-muted mb-3 text-sm">{calcMessage}</p> : null}
            <div className="grid gap-4">
              {results.map((result, index) => (
                <section key={index} className="glass-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Result {index + 1}</h3>
                    <Button variant="accent" onClick={() => void saveResult(result)}>
                      Save
                    </Button>
                  </div>
                  <p className="text-muted mb-3 text-sm">
                    ATK {Math.round(result.stats.atk)} · Crit {result.stats.critRate.toFixed(1)}% ·
                    CDMG {result.stats.critDmg.toFixed(1)}% · Interval {result.stats.attackInterval}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {result.pieces.map((piece) => {
                      const full = gear.find((row) => row.id === piece.id);
                      return full ? <GearTile key={piece.id} gear={full} /> : null;
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <GearFormModal
        open={gearFormOpen}
        gear={editingGear}
        heroes={heroes}
        error={formError}
        onClose={() => setGearFormOpen(false)}
        onSave={saveGear}
        onDelete={editingGear ? deleteGear : undefined}
      />

      <Modal
        open={selectedHero != null}
        onClose={() => setSelectedHero(null)}
        className="glass-modal-surface max-w-3xl"
      >
        {selectedHero ? (
          <>
            <h2>{selectedHero.name}</h2>
            {heroLoadout?.stats ? (
              <p className="text-muted mt-2 text-sm">
                HP {selectedHero.hp.toFixed(0)} +{Number(heroLoadout.stats.hpGear ?? 0).toFixed(0)}{' '}
                · ATK {selectedHero.atk.toFixed(0)} +
                {Number(heroLoadout.stats.atkGear ?? 0).toFixed(0)} · DEF{' '}
                {selectedHero.def.toFixed(0)} +{Number(heroLoadout.stats.defGear ?? 0).toFixed(0)} ·
                Crit {Number(heroLoadout.stats.critRate ?? 0).toFixed(1)}% · CDMG{' '}
                {Number(heroLoadout.stats.critDmg ?? 0).toFixed(1)}% · Interval{' '}
                {Number(heroLoadout.stats.attackInterval ?? 0)} · HE{' '}
                {Number(heroLoadout.stats.healingEffect ?? 0)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {GEAR_SLOTS.map((slot) => {
                const piece = heroLoadout?.gear.find((row) => row.slot === slot);
                return (
                  <div key={slot}>
                    {piece ? (
                      <GearTile gear={piece} size={88} />
                    ) : (
                      <EmptySlotTile slot={slot} size={88} />
                    )}
                    <p className="text-muted mt-1 text-xs">{SLOT_LABELS[slot]}</p>
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              <Button variant="cancel" onClick={() => setSelectedHero(null)}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
