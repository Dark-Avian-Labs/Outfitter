import {
  artifactIdentityKey,
  findDuplicateArtifact,
  identityFromArtifact,
} from '@shared/artifactDuplicate';
import { applyArtifactOcr, type ArtifactOcrFields } from '@shared/artifactOcr';
import {
  ARTIFACT_LEVEL_MIN,
  ARTIFACT_PROMOTION_MAX,
  ARTIFACT_SECONDARY_STATS,
  GEAR_STAT_LABELS,
  maxLevelForPromotion,
  outOfRangeArtifactLabels,
  type ArtifactSecondaryStat,
} from '@shared/catalog';
import { useEffect, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../utils/api';
import { FieldSelect } from './FieldSelect';
import type { ArtifactView, CatalogArtifact } from './types';

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

export type ArtifactDraft = ArtifactOcrFields;

function draftFromArtifact(
  artifact: ArtifactView | null,
  catalog: CatalogArtifact[],
): ArtifactDraft {
  return {
    catalog_slug: artifact?.catalog_slug ?? catalog[0]?.slug ?? '',
    level: artifact?.level ?? 1,
    promotion: artifact?.promotion ?? 0,
    hp_base: artifact?.hp_base ?? 0,
    hp_bonus: artifact?.hp_bonus ?? 0,
    atk_base: artifact?.atk_base ?? 0,
    atk_bonus: artifact?.atk_bonus ?? 0,
    secondary_stat: artifact?.secondary_stat ?? '',
    secondary_value: artifact?.secondary_value ?? 0,
  };
}

export function ArtifactFormModal({
  open,
  artifact,
  catalog,
  existingArtifacts,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  artifact: ArtifactView | null;
  catalog: CatalogArtifact[];
  existingArtifacts: ArtifactView[];
  error: string | null;
  onClose: () => void;
  onSave: (draft: ArtifactDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ArtifactDraft>(() => draftFromArtifact(artifact, catalog));
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [duplicateWarned, setDuplicateWarned] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const maxLevel = maxLevelForPromotion(draft.promotion);
  const identity = identityFromArtifact(draft);
  const identityKey = artifactIdentityKey(identity);
  const duplicate = findDuplicateArtifact(existingArtifacts, identity, artifact?.id);
  const selectedCatalog = catalog.find((row) => row.slug === draft.catalog_slug);
  const illegalLabels = outOfRangeArtifactLabels({
    rarity: selectedCatalog?.rarity ?? '',
    star_rating: selectedCatalog?.star_rating ?? 0,
    hp_base: draft.hp_base,
    hp_bonus: draft.hp_bonus,
    atk_base: draft.atk_base,
    atk_bonus: draft.atk_bonus,
    secondary_stat: draft.secondary_stat,
    secondary_value: draft.secondary_value,
  });

  useEffect(() => {
    if (open) {
      setDraft(draftFromArtifact(artifact, catalog));
      setOcrStatus(null);
      setDuplicateWarned(false);
      setConfirmDelete(false);
    }
  }, [artifact, catalog, open]);

  useEffect(() => {
    setDuplicateWarned(false);
  }, [identityKey]);

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
        const response = await apiFetch('/api/artifacts/ocr', {
          method: 'POST',
          body: JSON.stringify({ image: dataUrl }),
        });
        const body = (await response.json().catch(() => null)) as
          | (Partial<ArtifactDraft> & { error?: string })
          | null;
        if (!response.ok) {
          setOcrStatus(body?.error ?? 'Could not read that screenshot.');
          return;
        }
        setDraft((current) =>
          applyArtifactOcr(current, {
            catalog_slug: body?.catalog_slug ?? null,
            level: body?.level ?? null,
            promotion: body?.promotion ?? null,
            hp_base: body?.hp_base ?? null,
            hp_bonus: body?.hp_bonus ?? null,
            atk_base: body?.atk_base ?? null,
            atk_bonus: body?.atk_bonus ?? null,
            secondary_stat: body?.secondary_stat || null,
            secondary_value: body?.secondary_value ?? null,
          }),
        );
        setOcrStatus('Filled stats from screenshot.');
      } catch {
        setOcrStatus('Could not read that screenshot.');
      } finally {
        setOcrBusy(false);
      }
    }

    window.addEventListener('paste', readClipboardImage);
    return () => window.removeEventListener('paste', readClipboardImage);
  }, [open]);

  function saveDraft(): void {
    if (duplicate && !duplicateWarned) {
      setDuplicateWarned(true);
      return;
    }
    void onSave(draft);
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
        <h2>{artifact ? 'Edit artifact' : 'Add artifact'}</h2>
        <p className="text-muted mt-1 text-sm">
          Ctrl+V an artifact screenshot to fill name, level, and stats.
        </p>
        {ocrStatus ? <p className="mt-2 text-sm">{ocrStatus}</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FieldSelect
            className="sm:col-span-2"
            label="Artifact"
            value={draft.catalog_slug}
            options={[...catalog]
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
              .map((row) => ({
                value: row.slug,
                label: row.name,
                iconSrc: row.portrait_path ?? undefined,
              }))}
            onChange={(catalog_slug) => setDraft({ ...draft, catalog_slug })}
          />
          <label className="form-group block">
            <span>Level</span>
            <input
              className="form-input mt-1 w-full"
              type="number"
              min={ARTIFACT_LEVEL_MIN}
              max={maxLevel}
              value={draft.level}
              onChange={(event) => setDraft({ ...draft, level: Number(event.target.value) })}
            />
          </label>
          <FieldSelect
            label="Promotion"
            value={String(draft.promotion)}
            options={Array.from({ length: ARTIFACT_PROMOTION_MAX + 1 }, (_, promotion) => ({
              value: String(promotion),
              label: `P${promotion} (max ${maxLevelForPromotion(promotion)})`,
            }))}
            onChange={(value) => {
              const promotion = Number(value);
              const cap = maxLevelForPromotion(promotion);
              setDraft({
                ...draft,
                promotion,
                level: Math.min(draft.level, cap),
              });
            }}
          />
          <label className="form-group block">
            <span>HP</span>
            <input
              className={`form-input mt-1 w-full${illegalLabels.includes('HP') ? ' form-input--illegal' : ''}`}
              type="number"
              min={0}
              value={draft.hp_base}
              onChange={(event) => setDraft({ ...draft, hp_base: Number(event.target.value) })}
            />
          </label>
          <label className="form-group block">
            <span>HP bonus</span>
            <input
              className={`form-input mt-1 w-full${illegalLabels.includes('HP bonus') ? ' form-input--illegal' : ''}`}
              type="number"
              min={0}
              value={draft.hp_bonus}
              onChange={(event) => setDraft({ ...draft, hp_bonus: Number(event.target.value) })}
            />
          </label>
          <label className="form-group block">
            <span>ATK</span>
            <input
              className={`form-input mt-1 w-full${illegalLabels.includes('ATK') ? ' form-input--illegal' : ''}`}
              type="number"
              min={0}
              value={draft.atk_base}
              onChange={(event) => setDraft({ ...draft, atk_base: Number(event.target.value) })}
            />
          </label>
          <label className="form-group block">
            <span>ATK bonus</span>
            <input
              className={`form-input mt-1 w-full${illegalLabels.includes('ATK bonus') ? ' form-input--illegal' : ''}`}
              type="number"
              min={0}
              value={draft.atk_bonus}
              onChange={(event) => setDraft({ ...draft, atk_bonus: Number(event.target.value) })}
            />
          </label>
          <FieldSelect
            label="Secondary"
            value={draft.secondary_stat}
            options={[
              { value: '', label: 'None' },
              ...ARTIFACT_SECONDARY_STATS.map((stat) => ({
                value: stat,
                label: GEAR_STAT_LABELS[stat],
              })),
            ]}
            onChange={(secondary_stat) =>
              setDraft({
                ...draft,
                secondary_stat: secondary_stat as ArtifactSecondaryStat | '',
                secondary_value: secondary_stat ? draft.secondary_value : 0,
              })
            }
          />
          <label className="form-group block">
            <span>Secondary value</span>
            <input
              className={`form-input mt-1 w-full${
                draft.secondary_stat &&
                illegalLabels.includes(GEAR_STAT_LABELS[draft.secondary_stat])
                  ? ' form-input--illegal'
                  : ''
              }`}
              type="number"
              min={0}
              disabled={!draft.secondary_stat}
              value={draft.secondary_stat ? draft.secondary_value : ''}
              onChange={(event) =>
                setDraft({ ...draft, secondary_value: Number(event.target.value) })
              }
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
        {illegalLabels.length > 0 ? (
          <p className="mt-3 text-sm text-[var(--color-danger)]">
            Out of range: {illegalLabels.join(', ')}
          </p>
        ) : null}
        {duplicateWarned && duplicate ? (
          <p
            className="mt-3 rounded-lg border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_14%,transparent)] px-3 py-2 text-sm"
            role="status"
          >
            An artifact with the same name and stats already exists. Save anyway to keep a copy.
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
          <Button variant="accent" disabled={ocrBusy || !draft.catalog_slug} onClick={saveDraft}>
            {duplicateWarned && duplicate ? 'Save copy anyway' : 'Save'}
          </Button>
        </div>
      </Modal>
      <Modal
        open={open && confirmDelete}
        onClose={() => setConfirmDelete(false)}
        className="glass-modal-surface max-w-md"
      >
        <h2>Delete this artifact?</h2>
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
