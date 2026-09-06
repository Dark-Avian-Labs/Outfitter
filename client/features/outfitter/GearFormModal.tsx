import {
  FACTION_DISPLAY_NAMES,
  FACTIONS,
  GEAR_PREFIXES,
  GEAR_SLOTS,
  GEAR_STAT_KEYS,
  GEAR_STAT_LABELS,
  MAIN_STAT_BONUS_MAX,
  SLOT_LABELS,
  SLOT_MAIN_STATS,
  formatStatValue,
  gearEmptySlotSrc,
  gearSetBadgeSrc,
  type GearSlot,
  type GearStatKey,
} from '@shared/catalog';
import { findDuplicateGear, gearIdentityKey, identityFromGearRow } from '@shared/gearDuplicate';
import { applyOcrStats } from '@shared/gearOcr';
import { setsForSlot } from '@shared/sets';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { MaterialSymbol } from '../../components/ui/MaterialSymbol';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../utils/api';
import { FieldSelect } from './FieldSelect';
import type { GearView } from './GearTile';
import type { HeroRow } from './types';

function moveIndex<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image'));
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

export type GearDraft = {
  slot: GearSlot;
  set_key: string;
  prefix: (typeof GEAR_PREFIXES)[number];
  main_stat: GearStatKey;
  main_value: number;
  main_bonus: number;
  substats: { stat: GearStatKey; value: number }[];
  exclusive_hero_slug: string;
  exclusive_faction: string;
};

function draftFromGear(gear: GearView | null): GearDraft {
  const slot = gear?.slot ?? 'weapon';
  const sets = setsForSlot(slot);
  const substats = [
    gear?.sub1_stat && gear.sub1_value != null
      ? { stat: gear.sub1_stat, value: gear.sub1_value }
      : null,
    gear?.sub2_stat && gear.sub2_value != null
      ? { stat: gear.sub2_stat, value: gear.sub2_value }
      : null,
    gear?.sub3_stat && gear.sub3_value != null
      ? { stat: gear.sub3_stat, value: gear.sub3_value }
      : null,
    gear?.sub4_stat && gear.sub4_value != null
      ? { stat: gear.sub4_stat, value: gear.sub4_value }
      : null,
  ].filter((entry): entry is { stat: GearStatKey; value: number } => entry != null);
  while (substats.length < 4) {
    const used = new Set(substats.map((entry) => entry.stat));
    const next = GEAR_STAT_KEYS.find((key) => !used.has(key)) ?? 'atk';
    substats.push({ stat: next, value: 0 });
  }
  return {
    slot,
    set_key: gear?.set_key ?? sets[0]?.key ?? 'calamity',
    prefix: gear?.prefix ?? 'none',
    main_stat: gear?.main_stat ?? SLOT_MAIN_STATS[slot][0],
    main_value: gear?.main_value ?? 1,
    main_bonus: gear?.main_bonus ?? 0,
    substats,
    exclusive_hero_slug: gear?.exclusive_hero_slug ?? '',
    exclusive_faction: gear?.exclusive_faction ?? '',
  };
}

export function GearFormModal({
  open,
  gear,
  existingGear,
  heroes,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  gear: GearView | null;
  existingGear: GearView[];
  heroes: HeroRow[];
  error: string | null;
  onClose: () => void;
  onSave: (draft: GearDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<GearDraft>(() => draftFromGear(gear));
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [duplicateWarned, setDuplicateWarned] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const substatListRef = useRef<HTMLDivElement>(null);
  const slotSets = setsForSlot(draft.slot);
  const mainOptions = SLOT_MAIN_STATS[draft.slot];
  const bonusMax = MAIN_STAT_BONUS_MAX[draft.main_stat] ?? 0;

  useEffect(() => {
    if (open) {
      setDraft(draftFromGear(gear));
      setOcrStatus(null);
      setDuplicateWarned(false);
      setConfirmDelete(false);
      setDragFrom(null);
      setDragOver(null);
      dragFromRef.current = null;
      dragOverRef.current = null;
    }
  }, [gear, open]);

  useEffect(() => {
    if (!open) return undefined;

    async function readClipboardImage(event: ClipboardEvent): Promise<void> {
      const items = event.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      event.preventDefault();
      setOcrBusy(true);
      setOcrStatus('Reading screenshot…');
      try {
        const dataUrl = await fileToDataUrl(file);
        const response = await apiFetch('/api/gear/ocr', {
          method: 'POST',
          body: JSON.stringify({ image: dataUrl }),
        });
        const body = (await response.json().catch(() => null)) as {
          stats?: { stat: GearStatKey; value: number }[];
          slot?: GearDraft['slot'] | null;
          set_key?: string | null;
          prefix?: GearDraft['prefix'] | null;
          error?: string;
        } | null;
        if (!response.ok) {
          setOcrStatus(body?.error ?? 'Could not read that screenshot.');
          return;
        }
        const stats = body?.stats ?? [];
        if (stats.length === 0) {
          setOcrStatus('No stats found. Try a tighter crop of the main and sub stats.');
          return;
        }
        setDraft((current) =>
          applyOcrStats(current, {
            stats,
            slot: body?.slot ?? null,
            set_key: body?.set_key ?? null,
            prefix: body?.prefix ?? null,
          }),
        );
        setOcrStatus(
          `Filled ${stats.length} stat${stats.length === 1 ? '' : 's'} from screenshot.`,
        );
      } catch {
        setOcrStatus('Could not read that screenshot.');
      } finally {
        setOcrBusy(false);
      }
    }

    window.addEventListener('paste', readClipboardImage);
    return () => window.removeEventListener('paste', readClipboardImage);
  }, [open]);

  const identity = identityFromGearRow(draft);
  const identityKey = gearIdentityKey(identity);
  const duplicate = findDuplicateGear(existingGear, identity, gear?.id);

  useEffect(() => {
    setDuplicateWarned(false);
  }, [identityKey]);

  function saveDraft(): void {
    const payload = {
      ...draft,
      substats: draft.substats.filter((sub) => sub.value > 0),
    };
    if (duplicate && !duplicateWarned) {
      setDuplicateWarned(true);
      return;
    }
    void onSave(payload);
  }

  function substatIndexAtY(clientY: number): number | null {
    const rows = substatListRef.current?.querySelectorAll<HTMLElement>('[data-substat-index]');
    if (!rows || rows.length === 0) return null;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (clientY < rect.bottom) return Number(row.dataset.substatIndex);
    }
    return rows.length - 1;
  }

  function finishSubstatDrag(): void {
    const from = dragFromRef.current;
    const to = dragOverRef.current;
    dragFromRef.current = null;
    dragOverRef.current = null;
    setDragFrom(null);
    setDragOver(null);
    if (from == null || to == null || from === to) return;
    setDraft((current) => ({ ...current, substats: moveIndex(current.substats, from, to) }));
  }

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (confirmDelete) setConfirmDelete(false);
          else onClose();
        }}
        className="glass-modal-surface max-w-2xl"
      >
        <h2>{gear ? 'Edit gear' : 'Add gear'}</h2>
        <p className="text-muted mt-1 text-sm">
          Ctrl+V a gear screenshot to fill type, set, prefix, and stats.
        </p>
        {ocrStatus ? <p className="mt-2 text-sm">{ocrStatus}</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-start">
          <div className="grid gap-3">
            <FieldSelect
              label="Prefix"
              value={draft.prefix}
              options={GEAR_PREFIXES.map((prefix) => ({
                value: prefix,
                label: prefix === 'none' ? 'None' : prefix[0].toUpperCase() + prefix.slice(1),
              }))}
              onChange={(prefix) => setDraft({ ...draft, prefix: prefix as GearDraft['prefix'] })}
            />
            <FieldSelect
              label="Hero exclusive"
              value={draft.exclusive_hero_slug}
              options={[
                { value: '', label: 'None' },
                ...heroes.map((hero) => ({ value: hero.slug, label: hero.name })),
              ]}
              onChange={(exclusive_hero_slug) =>
                setDraft({
                  ...draft,
                  exclusive_hero_slug,
                  exclusive_faction: exclusive_hero_slug ? '' : draft.exclusive_faction,
                })
              }
            />
            <FieldSelect
              label="Faction exclusive"
              value={draft.exclusive_faction}
              options={[
                { value: '', label: 'None' },
                ...FACTIONS.filter((faction) => faction !== 'unaffiliated').map((faction) => ({
                  value: faction,
                  label: FACTION_DISPLAY_NAMES[faction],
                })),
              ]}
              onChange={(exclusive_faction) =>
                setDraft({
                  ...draft,
                  exclusive_faction,
                  exclusive_hero_slug: exclusive_faction ? '' : draft.exclusive_hero_slug,
                })
              }
            />
            <FieldSelect
              label="Main stat"
              value={draft.main_stat}
              options={mainOptions.map((stat) => ({ value: stat, label: GEAR_STAT_LABELS[stat] }))}
              onChange={(main_stat) =>
                setDraft({ ...draft, main_stat: main_stat as GearStatKey, main_bonus: 0 })
              }
            />
            <label className="form-group block">
              <span>Main value</span>
              <input
                className="form-input mt-1 w-full"
                type="number"
                min={1}
                value={draft.main_value}
                onChange={(event) => setDraft({ ...draft, main_value: Number(event.target.value) })}
              />
            </label>
            <FieldSelect
              label={`Main bonus (0–${bonusMax})`}
              value={String(Math.min(draft.main_bonus, bonusMax))}
              options={Array.from({ length: bonusMax + 1 }, (_, bonus) => ({
                value: String(bonus),
                label: bonus === 0 ? '0' : `+${formatStatValue(draft.main_stat, bonus)}`,
              }))}
              onChange={(bonus) => setDraft({ ...draft, main_bonus: Number(bonus) })}
            />
          </div>
          <div className="grid gap-3" ref={substatListRef}>
            <FieldSelect
              label="Type"
              value={draft.slot}
              options={GEAR_SLOTS.map((slot) => ({
                value: slot,
                label: SLOT_LABELS[slot],
                iconSrc: gearEmptySlotSrc(slot),
              }))}
              onChange={(slot) => {
                const next = slot as GearSlot;
                const sets = setsForSlot(next);
                setDraft({
                  ...draft,
                  slot: next,
                  set_key: sets.some((set) => set.key === draft.set_key)
                    ? draft.set_key
                    : (sets[0]?.key ?? ''),
                  main_stat: SLOT_MAIN_STATS[next].includes(draft.main_stat)
                    ? draft.main_stat
                    : SLOT_MAIN_STATS[next][0],
                });
              }}
            />
            <FieldSelect
              label="Set"
              value={draft.set_key}
              options={slotSets.map((set) => ({
                value: set.key,
                label: set.name,
                iconSrc: gearSetBadgeSrc(set.key),
              }))}
              onChange={(set_key) => setDraft({ ...draft, set_key })}
            />
            {draft.substats.map((sub, index) => (
              <div
                key={index}
                data-substat-index={index}
                className={`grid grid-cols-[1.75rem_1fr_6rem] items-end gap-2 rounded-[var(--radius-ui-sm)]${
                  dragOver === index && dragFrom !== index
                    ? ' ring-1 ring-[var(--color-accent)]'
                    : ''
                }${dragFrom === index ? ' opacity-60' : ''}`}
              >
                <button
                  type="button"
                  className="text-muted hover:text-foreground flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center select-none active:cursor-grabbing"
                  aria-label={`Reorder substat ${index + 1}`}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragFromRef.current = index;
                    dragOverRef.current = index;
                    setDragFrom(index);
                    setDragOver(index);
                  }}
                  onPointerMove={(event) => {
                    if (dragFromRef.current == null) return;
                    const over = substatIndexAtY(event.clientY);
                    if (over == null) return;
                    dragOverRef.current = over;
                    setDragOver(over);
                  }}
                  onPointerUp={finishSubstatDrag}
                  onPointerCancel={finishSubstatDrag}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp' && index > 0) {
                      event.preventDefault();
                      setDraft((current) => ({
                        ...current,
                        substats: moveIndex(current.substats, index, index - 1),
                      }));
                    }
                    if (event.key === 'ArrowDown' && index < draft.substats.length - 1) {
                      event.preventDefault();
                      setDraft((current) => ({
                        ...current,
                        substats: moveIndex(current.substats, index, index + 1),
                      }));
                    }
                  }}
                >
                  <MaterialSymbol name="drag_indicator" style={{ fontSize: 18 }} />
                </button>
                <FieldSelect
                  label={`Substat ${index + 1}`}
                  value={sub.stat}
                  options={GEAR_STAT_KEYS.map((stat) => ({
                    value: stat,
                    label: GEAR_STAT_LABELS[stat],
                  }))}
                  onChange={(stat) => {
                    const substats = [...draft.substats];
                    substats[index] = { ...sub, stat: stat as GearStatKey };
                    setDraft({ ...draft, substats });
                  }}
                />
                <label className="form-group block">
                  <span>Value</span>
                  <input
                    className="form-input mt-1 w-full"
                    type="number"
                    min={0}
                    value={sub.value}
                    onChange={(event) => {
                      const substats = [...draft.substats];
                      substats[index] = { ...sub, value: Number(event.target.value) };
                      setDraft({ ...draft, substats });
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
        {duplicateWarned && duplicate ? (
          <p
            className="mt-3 rounded-lg border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_14%,transparent)] px-3 py-2 text-sm"
            role="status"
          >
            A piece with the same type, set, and stats already exists. Save anyway to keep a copy.
          </p>
        ) : null}
        <div className="modal-actions">
          {onDelete ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
          <Button variant="cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" disabled={ocrBusy} onClick={saveDraft}>
            {duplicateWarned && duplicate ? 'Save copy anyway' : 'Save'}
          </Button>
        </div>
      </Modal>
      <Modal
        open={open && confirmDelete}
        onClose={() => setConfirmDelete(false)}
        className="glass-modal-surface max-w-md"
      >
        <h2>Delete this piece?</h2>
        <p className="text-muted mt-2 text-sm">This cannot be undone.</p>
        <div className="modal-actions">
          <Button variant="cancel" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDelete(false);
              void onDelete?.();
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
