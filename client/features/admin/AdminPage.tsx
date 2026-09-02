import { useCallback, useEffect, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { apiFetch } from '../../utils/api';

type CatalogStatus = {
  heroes: number;
  missingStats: number;
};

type ImportSummary = CatalogStatus & {
  portraitsCopied: number;
  iconsCopied: number;
};

export function AdminPage() {
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const loadStatus = useCallback(async () => {
    const response = await apiFetch('/api/admin/catalog');
    if (!response.ok) throw new Error('Could not load catalog status');
    const body = (await response.json()) as CatalogStatus;
    setStatus(body);
  }, []);

  useEffect(() => {
    void loadStatus().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not load catalog status');
    });
  }, [loadStatus]);

  async function importCatalog(): Promise<void> {
    setRunning(true);
    setError(null);
    try {
      const response = await apiFetch('/api/admin/import-catalog', { method: 'POST' });
      const body = (await response.json().catch(() => null)) as
        | (ImportSummary & { error?: string })
        | null;
      if (!response.ok) {
        setError(body?.error ?? 'Catalog import failed');
        return;
      }
      if (body) {
        setLastImport(body);
        setStatus({ heroes: body.heroes, missingStats: body.missingStats });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Catalog import failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="glass-surface max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-muted mt-1 text-sm">
        Copy Watcher of Realms heroes and portraits from the Codex database. Use this on the live
        server; there is no CLI there.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Heroes</dt>
          <dd className="text-lg font-semibold">{status?.heroes ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Missing wiki stats</dt>
          <dd className="text-lg font-semibold">{status?.missingStats ?? '—'}</dd>
        </div>
      </dl>
      {lastImport ? (
        <p className="text-muted mt-3 text-sm">
          Last sync copied {lastImport.portraitsCopied} portraits and {lastImport.iconsCopied}{' '}
          icons.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
      <div className="modal-actions mt-5 justify-start">
        <Button variant="accent" disabled={running} onClick={() => void importCatalog()}>
          {running ? 'Syncing…' : 'Sync catalog from Codex'}
        </Button>
      </div>
    </section>
  );
}
