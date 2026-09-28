import { gearSetBadgeSrc } from '@shared/catalog';
import { SCORE_STAT_KEYS, SCORE_STAT_LABELS, type ScoreStatKey } from '@shared/optimizer';
import { LEFT_SETS, RIGHT_SETS, setsSortedByTier } from '@shared/sets';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../utils/api';
import { FieldSelect } from './FieldSelect';
import { GearTile, type GearView } from './GearTile';
import { OutfitStatsList, readOutfitCalculate } from './tabShared';
import type { HeroRow, OutfitResult } from './types';

export function OutfitTab({
  heroes,
  gear,
  onSaved,
}: {
  heroes: HeroRow[];
  gear: GearView[];
  onSaved: () => Promise<void>;
}) {
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
  const calcAbortRef = useRef<AbortController | null>(null);
  const [heroDraft, setHeroDraft] = useState<HeroRow | null>(null);

  const outfitHeroRow = heroes.find((hero) => hero.slug === outfitHero) ?? null;

  useEffect(() => {
    setHeroDraft(outfitHeroRow);
  }, [outfitHeroRow]);

  function cancelCalculate(): void {
    calcAbortRef.current?.abort();
    calcAbortRef.current = null;
    setCalcProgress(null);
    setCalcSearching(false);
  }

  async function calculate(): Promise<void> {
    if (!outfitHero || calcProgress != null) return;
    const controller = new AbortController();
    calcAbortRef.current = controller;
    setCalcMessage(null);
    setResults([]);
    setCalcProgress(0);
    setCalcSearching(false);
    try {
      const response = await apiFetch('/api/outfit/calculate', {
        method: 'POST',
        signal: controller.signal,
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
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setCalcMessage(body?.error ?? 'Calculate failed');
        return;
      }
      const { results: next, error } = await readOutfitCalculate(response, (done, total) => {
        setCalcSearching(true);
        setCalcProgress(total > 0 ? done / total : 1);
      });
      if (controller.signal.aborted) return;
      if (error) {
        setCalcMessage(error);
        return;
      }
      setResults(next);
      if (next.length === 0) {
        setCalcMessage('No loadout matches. Relax mins, turn off Force sets, or add more gear.');
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return;
      }
      setCalcMessage('Calculate failed');
    } finally {
      if (calcAbortRef.current === controller) {
        calcAbortRef.current = null;
        setCalcProgress(null);
        setCalcSearching(false);
      }
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
    await onSaved();
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
    await onSaved();
  }

  return (
    <>
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
      <Modal
        open={calcProgress != null}
        onClose={cancelCalculate}
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
        <div className="modal-actions">
          <Button variant="cancel" onClick={cancelCalculate}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
