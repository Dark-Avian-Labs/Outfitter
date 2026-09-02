import { describe, expect, it } from 'vitest';

import { setsForSlot, setsSortedByTier } from './sets.js';

describe('setsSortedByTier', () => {
  it('orders all sets by tier, left then right within a tier', () => {
    const keys = setsSortedByTier().map((set) => set.key);
    const tiers = setsSortedByTier().map((set) => set.tier);
    expect(tiers.slice(1).every((tier, index) => tier >= (tiers[index] ?? 0))).toBe(true);
    expect(keys.indexOf('calamity')).toBeLessThan(keys.indexOf('fatality'));
    expect(keys.indexOf('warlord')).toBeLessThan(keys.indexOf('ageless_wrath'));
    expect(keys.indexOf('hells_lament')).toBeGreaterThan(keys.indexOf('warlord'));
  });
});

describe('setsForSlot', () => {
  it('returns left-side sets in tier order for weapons', () => {
    const sets = setsForSlot('weapon');
    expect(sets.every((set) => set.side === 'left')).toBe(true);
    expect(sets.slice(1).every((set, index) => set.tier >= (sets[index]?.tier ?? 0))).toBe(true);
    expect(sets[0]?.tier).toBe(1);
    expect(sets.at(-1)?.tier).toBe(3);
  });
});
