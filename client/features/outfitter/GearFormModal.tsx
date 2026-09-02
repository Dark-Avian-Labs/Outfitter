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
import { useEffect, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../utils/api';
import { FieldSelect } from './FieldSelect';
import type { GearView } from './GearTile';
import type { HeroRow } from './types';

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
  const slotSets = setsForSlot(draft.slot);
  const mainOptions = SLOT_MAIN_STATS[draft.slot];
  const bonusMax = MAIN_STAT_BONUS_MAX[draft.main_stat] ?? 0;

  useEffect(() => {
    if (open) {
      setDraft(draftFromGear(gear));
      setOcrStatus(null);
      setDuplicateWarned(false);
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
        setDraft((current) => applyOcrStats(current, stats));
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

  return (
    <Modal open={open} onClose={onClose} className="glass-modal-surface max-w-2xl">
      <h2>{gear ? 'Edit gear' : 'Add gear'}</h2>
      <p className="text-muted mt-1 text-sm">
        Ctrl+V a gear screenshot to fill stat types and values. Slot, set, and prefix stay manual.
      </p>
      {ocrStatus ? <p className="mt-2 text-sm">{ocrStatus}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {draft.substats.map((sub, index) => (
          <div key={index} className="grid grid-cols-[1fr_6rem] gap-2">
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
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <Button variant="danger" onClick={() => void onDelete()}>
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
  );
}
