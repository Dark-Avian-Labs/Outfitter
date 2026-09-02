import type { ReactNode } from 'react';

import type { FilterTriState } from '../../lib/triFilter';

type FilterIconButtonProps = {
  state: FilterTriState;
  label: string;
  onClick: () => void;
  children: ReactNode;
};

export function FilterIconButton({ state, label, onClick, children }: FilterIconButtonProps) {
  let className = 'filter-icon';
  if (state === 'include') className = 'filter-icon active';
  else if (state === 'exclude') className = 'filter-icon exclude';

  return (
    <button
      type="button"
      className={className}
      title={state === 'off' ? label : `${label} (${state})`}
      aria-pressed={state !== 'off'}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
