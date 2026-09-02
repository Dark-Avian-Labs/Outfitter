import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Menu } from '../../components/ui/Menu';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../utils/api';
import type { GameAccount } from './types';

export function AccountBar({
  accounts,
  currentId,
  onChange,
}: {
  accounts: GameAccount[];
  currentId: number | null;
  onChange: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = useMemo(
    () => accounts.find((account) => account.id === currentId) ?? null,
    [accounts, currentId],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function switchAccount(id: number): Promise<void> {
    try {
      const response = await apiFetch('/api/accounts/switch', {
        method: 'POST',
        body: JSON.stringify({ account_id: id }),
      });
      if (!response.ok) {
        setError('Could not switch account');
        return;
      }
      setError(null);
      await onChange();
      setOpen(false);
    } catch {
      setError('Could not switch account');
    }
  }

  async function createAccount(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const response = await apiFetch('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ account_name: trimmed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Could not create account');
        return;
      }
      setError(null);
      setName('');
      setModalOpen(false);
      await onChange();
    } catch {
      setError('Could not create account');
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className="header-link" onClick={() => setOpen((value) => !value)}>
        {current?.account_name ?? 'Accounts'}
      </button>
      {open ? (
        <Menu>
          {accounts.length === 0 ? (
            <p className="text-muted px-3 py-2 text-sm">No accounts yet.</p>
          ) : null}
          {error ? <p className="text-danger px-3 py-2 text-sm">{error}</p> : null}
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className={`header-link w-full ${account.id === currentId ? 'active' : ''}`}
              onClick={() => void switchAccount(account.id)}
            >
              {account.account_name}
            </button>
          ))}
          <div className="user-menu-divider" role="separator" />
          <button type="button" className="header-link w-full" onClick={() => setModalOpen(true)}>
            Add account
          </button>
        </Menu>
      ) : null}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        className="glass-modal-surface max-w-md"
      >
        <h2>New account</h2>
        <label className="form-group mt-4 block">
          <span>Name</span>
          <input
            className="form-input mt-1 w-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error ? <p className="text-danger mt-2 text-sm">{error}</p> : null}
        <div className="modal-actions">
          <Button variant="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={() => void createAccount()}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
