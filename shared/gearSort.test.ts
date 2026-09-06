import { describe, expect, it } from 'vitest';

import { compareInventoryGear } from './gearSort.js';
import { ALL_SETS, INVENTORY_SET_KEYS } from './sets.js';

describe('INVENTORY_SET_KEYS', () => {
  it('lists every set exactly once in in-game bag order', () => {
    expect([...INVENTORY_SET_KEYS].sort()).toEqual(ALL_SETS.map((set) => set.key).sort());
    expect(INVENTORY_SET_KEYS[0]).toBe('greyfang');
    expect(INVENTORY_SET_KEYS[25]).toBe('goldmane');
    expect(INVENTORY_SET_KEYS.at(-1)).toBe('annihilating_might');
  });
});

describe('compareInventoryGear', () => {
  it('sorts variant before ancient before normal, then 3-piece before 2-piece, then bangle before weapon', () => {
    const pieces = [
      { prefix: 'none', set_key: 'calamity', slot: 'weapon' },
      { prefix: 'variant', set_key: 'guardian', slot: 'ring' },
      { prefix: 'ancient', set_key: 'greyfang', slot: 'weapon' },
      { prefix: 'variant', set_key: 'greyfang', slot: 'weapon' },
      { prefix: 'variant', set_key: 'greyfang', slot: 'bangle' },
      { prefix: 'ancient', set_key: 'goldmane', slot: 'armor' },
    ] as const;
    expect(
      [...pieces].sort(compareInventoryGear).map((piece) => `${piece.prefix}:${piece.set_key}:${piece.slot}`),
    ).toEqual([
      'variant:greyfang:bangle',
      'variant:greyfang:weapon',
      'variant:guardian:ring',
      'ancient:greyfang:weapon',
      'ancient:goldmane:armor',
      'none:calamity:weapon',
    ]);
  });
});
