import {
  CLASS_DISPLAY_NAMES,
  FACTION_DISPLAY_NAMES,
  FACTIONS,
  FILTER_STAR_RARITY_LABELS,
  FILTER_STAR_RATINGS,
  GEAR_SLOTS,
  HERO_CLASSES,
  type GearSlot,
} from '@shared/catalog';
import { computeFinalStats, type FinalStats } from '@shared/formulas';
import { loadoutStatBag } from '@shared/pieceStats';
import { useMemo, useState } from 'react';

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
import { FieldSelect } from './FieldSelect';
import { EmptySlotTile, GearTile, type GearView } from './GearTile';
import {
  ArtifactPortrait,
  GearPieceCard,
  LOADOUT_LEFT_SLOTS,
  LOADOUT_RIGHT_SLOTS,
  OutfitStatsList,
  gearToPieceInput,
  heroBase,
} from './tabShared';
import type { ArtifactView, HeroRow } from './types';
import { STAR_ICONS, WorIcon, classIconSrc, factionIconSrc, renderStars } from './worIcons';

export function EquipmentTab({
  heroes,
  gear,
  artifacts,
  onSaved,
}: {
  heroes: HeroRow[];
  gear: GearView[];
  artifacts: ArtifactView[];
  onSaved: () => Promise<void>;
}) {
  const [classFilter, setClassFilter] = useState<TriFilterMap>({});
  const [factionFilter, setFactionFilter] = useState<TriFilterMap>({});
  const [rarityFilter, setRarityFilter] = useState<TriFilterMap>({});
  const [selectedHero, setSelectedHero] = useState<HeroRow | null>(null);
  const [heroLoadout, setHeroLoadout] = useState<{
    gear: GearView[];
    artifact: ArtifactView | null;
    stats: FinalStats | null;
  } | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  const equippedArtifactByHero = useMemo(() => {
    const map = new Map<string, ArtifactView>();
    for (const row of artifacts) {
      if (!row.equipped_hero_slug) continue;
      map.set(row.equipped_hero_slug, row);
    }
    return map;
  }, [artifacts]);

  const artifactsByName = useMemo(
    () =>
      artifacts
        .slice()
        .sort(
          (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id - b.id,
        ),
    [artifacts],
  );

  const selectedEquipmentArtifact = useMemo(() => {
    if (selectedArtifactId === '') return null;
    return artifacts.find((row) => String(row.id) === selectedArtifactId) ?? null;
  }, [artifacts, selectedArtifactId]);

  const previewLoadoutStats = useMemo(() => {
    if (!selectedHero || !heroLoadout) return null;
    return computeFinalStats(
      heroBase(selectedHero),
      loadoutStatBag(heroLoadout.gear.map(gearToPieceInput), selectedEquipmentArtifact),
    );
  }, [heroLoadout, selectedEquipmentArtifact, selectedHero]);

  async function openHero(hero: HeroRow): Promise<void> {
    setSelectedHero(hero);
    setHeroLoadout(null);
    setSelectedArtifactId('');
    setFormError(null);
    const response = await apiFetch(`/api/heroes/${hero.slug}/loadout`);
    if (!response.ok) return;
    const body = (await response.json()) as {
      gear?: GearView[];
      artifact?: ArtifactView | null;
      stats?: FinalStats | null;
    };
    const artifact = body.artifact ?? null;
    setHeroLoadout({ gear: body.gear ?? [], artifact, stats: body.stats ?? null });
    setSelectedArtifactId(artifact ? String(artifact.id) : '');
  }

  async function saveHeroArtifact(): Promise<void> {
    if (!selectedHero) return;
    const response = await apiFetch(`/api/heroes/${selectedHero.slug}/artifact`, {
      method: 'PATCH',
      body: JSON.stringify({
        artifact_id: selectedArtifactId === '' ? null : Number(selectedArtifactId),
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(body?.error ?? 'Could not save artifact');
      return;
    }
    setSelectedHero(null);
    await onSaved();
  }

  return (
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
              <WorIcon
                className="invert-on-light"
                src={classIconSrc(heroClass)}
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
              <WorIcon
                src={factionIconSrc(faction)}
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
            const artifact = equippedArtifactByHero.get(hero.slug);
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
                  {artifact ? (
                    <ArtifactPortrait
                      src={artifact.portrait_path}
                      size={48}
                      title={artifact.name}
                      promotion={artifact.promotion}
                      rarity={artifact.rarity}
                      starRating={artifact.star_rating}
                    />
                  ) : (
                    <div
                      className="gear-tile gear-tile--empty"
                      style={{ width: 48, height: 48 }}
                      title="Artifact"
                    />
                  )}
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
                <div className="gear-piece-card glass-surface">
                  <div className="gear-piece-card__head">
                    {selectedEquipmentArtifact ? (
                      <ArtifactPortrait
                        src={selectedEquipmentArtifact.portrait_path}
                        size={72}
                        promotion={selectedEquipmentArtifact.promotion}
                        rarity={selectedEquipmentArtifact.rarity}
                        starRating={selectedEquipmentArtifact.star_rating}
                      />
                    ) : (
                      <div
                        className="gear-tile gear-tile--empty"
                        style={{ width: 72, height: 72 }}
                        title="Artifact"
                      />
                    )}
                    <div className="gear-piece-card__meta min-w-0 flex-1">
                      <div className="gear-piece-card__slot">Artifact</div>
                      <FieldSelect
                        className="mt-1 min-w-0"
                        value={selectedArtifactId}
                        options={[
                          { value: '', label: 'None' },
                          ...artifactsByName.map((row) => ({
                            value: String(row.id),
                            label:
                              row.equipped_hero_slug && row.equipped_hero_slug !== selectedHero.slug
                                ? `${row.name} · ${row.equipped_hero_name ?? row.equipped_hero_slug}`
                                : row.name,
                            iconSrc: row.portrait_path ?? undefined,
                          })),
                        ]}
                        onChange={setSelectedArtifactId}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="equipment-loadout-stats glass-surface">
                {previewLoadoutStats ? (
                  <OutfitStatsList stats={previewLoadoutStats} hero={selectedHero} />
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
            {formError ? (
              <p className="mt-3 text-sm text-[var(--color-danger)]">{formError}</p>
            ) : null}
            <div className="modal-actions">
              <Button variant="cancel" onClick={() => setSelectedHero(null)}>
                Close
              </Button>
              <Button variant="accent" onClick={() => void saveHeroArtifact()}>
                Save
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
