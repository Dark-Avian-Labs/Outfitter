import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../../utils/api';
import { AccountBar } from './AccountBar';
import { ArtifactFormModal, type ArtifactDraft } from './ArtifactFormModal';
import { ArtifactsTab } from './ArtifactsTab';
import { EquipmentTab } from './EquipmentTab';
import { GearFormModal, type GearDraft } from './GearFormModal';
import { GearTab } from './GearTab';
import { type GearView } from './GearTile';
import { OutfitTab } from './OutfitTab';
import { RerollTab } from './RerollTab';
import type { ArtifactView, CatalogArtifact, GameAccount, HeroRow } from './types';

type Tab = 'gear' | 'artifacts' | 'reroll' | 'equipment' | 'outfit';

export function OutfitterPage() {
  const [tab, setTab] = useState<Tab>('gear');
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number | null>(null);
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [gear, setGear] = useState<GearView[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactView[]>([]);
  const [artifactCatalog, setArtifactCatalog] = useState<CatalogArtifact[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gearFormOpen, setGearFormOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<GearView | null>(null);
  const [artifactFormOpen, setArtifactFormOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<ArtifactView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
        setArtifacts([]);
        setArtifactCatalog([]);
        return;
      }
      const [heroesRes, gearRes, artifactsRes] = await Promise.all([
        apiFetch('/api/heroes'),
        apiFetch('/api/gear'),
        apiFetch('/api/artifacts'),
      ]);
      if (!heroesRes.ok) throw new Error('Failed to load heroes. Import the Codex catalog first.');
      if (!gearRes.ok) throw new Error('Failed to load gear');
      if (!artifactsRes.ok) throw new Error('Failed to load artifacts');
      const heroesBody = (await heroesRes.json()) as { heroes?: HeroRow[] };
      const gearBody = (await gearRes.json()) as { gear?: GearView[] };
      const artifactsBody = (await artifactsRes.json()) as {
        artifacts?: ArtifactView[];
        catalog?: CatalogArtifact[];
      };
      setHeroes(heroesBody.heroes ?? []);
      setGear(gearBody.gear ?? []);
      setArtifacts(artifactsBody.artifacts ?? []);
      setArtifactCatalog(artifactsBody.catalog ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load');
    }
  }, [loadAccounts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openGear(piece: GearView | null): void {
    setEditingGear(piece);
    setFormError(null);
    setGearFormOpen(true);
  }

  function openArtifact(row: ArtifactView | null): void {
    setEditingArtifact(row);
    setFormError(null);
    setArtifactFormOpen(true);
  }

  async function saveGear(draft: GearDraft): Promise<void> {
    setFormError(null);
    const payload = {
      ...draft,
      exclusive_hero_slug: draft.exclusive_hero_slug || null,
      exclusive_faction: draft.exclusive_faction || null,
      equipped_hero_slug: draft.equipped_hero_slug || null,
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

  async function saveArtifact(draft: ArtifactDraft): Promise<void> {
    setFormError(null);
    const payload = {
      ...draft,
      secondary_stat: draft.secondary_stat || null,
      secondary_value: draft.secondary_stat ? draft.secondary_value : null,
    };
    const response = await apiFetch(
      editingArtifact ? `/api/artifacts/${editingArtifact.id}` : '/api/artifacts',
      {
        method: editingArtifact ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(body?.error ?? 'Could not save artifact');
      return;
    }
    setArtifactFormOpen(false);
    setEditingArtifact(null);
    await reload();
  }

  async function deleteArtifact(): Promise<void> {
    if (!editingArtifact) return;
    const response = await apiFetch(`/api/artifacts/${editingArtifact.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setFormError('Could not delete artifact');
      return;
    }
    setArtifactFormOpen(false);
    setEditingArtifact(null);
    await reload();
  }

  return (
    <div>
      <div className="tabs items-center">
        <div className="flex min-w-0 flex-wrap gap-1" role="tablist" aria-label="Outfitter tabs">
          {(['gear', 'artifacts', 'reroll', 'equipment', 'outfit'] as const).map((item) => (
            <button
              key={item}
              id={`outfitter-tab-${item}`}
              type="button"
              role="tab"
              className={`tab ${tab === item ? 'active' : ''}`}
              aria-selected={tab === item}
              onClick={() => setTab(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <AccountBar accounts={accounts} currentId={currentAccountId} onChange={reload} />
        </div>
      </div>

      {loadError ? <p className="mb-4 text-sm text-[var(--color-danger)]">{loadError}</p> : null}
      {accounts.length === 0 ? (
        <p className="text-muted text-sm">Create an account to store gear.</p>
      ) : null}

      {tab === 'gear' ? (
        <GearTab gear={gear} onAdd={() => openGear(null)} onEdit={openGear} />
      ) : null}
      {tab === 'artifacts' ? (
        <ArtifactsTab
          artifacts={artifacts}
          onAdd={() => openArtifact(null)}
          onEdit={openArtifact}
        />
      ) : null}
      {tab === 'reroll' ? <RerollTab gear={gear} onOpenGear={openGear} /> : null}
      {tab === 'equipment' ? (
        <EquipmentTab heroes={heroes} gear={gear} artifacts={artifacts} onSaved={reload} />
      ) : null}
      {tab === 'outfit' ? <OutfitTab heroes={heroes} gear={gear} onSaved={reload} /> : null}

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

      <ArtifactFormModal
        open={artifactFormOpen}
        artifact={editingArtifact}
        catalog={artifactCatalog}
        existingArtifacts={artifacts}
        error={formError}
        onClose={() => setArtifactFormOpen(false)}
        onSave={saveArtifact}
        onDelete={editingArtifact ? deleteArtifact : undefined}
      />
    </div>
  );
}
