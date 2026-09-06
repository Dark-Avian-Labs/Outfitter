import { describe, expect, it } from 'vitest';

import { gearHasOutOfRangeStats, outOfRangeGearLabels } from './catalog.js';

const legal = {
  main_stat: 'atkBonus' as const,
  main_bonus: 5,
  sub1_stat: 'atkBonus' as const,
  sub1_value: 18,
  sub2_stat: 'critRate' as const,
  sub2_value: 20.5,
  sub3_stat: 'critDmg' as const,
  sub3_value: 34.5,
  sub4_stat: 'hp' as const,
  sub4_value: 1500,
};

describe('gearHasOutOfRangeStats', () => {
  it('accepts in-range mythic subs and a legal gem bonus', () => {
    expect(gearHasOutOfRangeStats(legal)).toBe(false);
  });

  it('flags a substat above max', () => {
    expect(gearHasOutOfRangeStats({ ...legal, sub1_value: 34 })).toBe(true);
    expect(outOfRangeGearLabels({ ...legal, sub1_value: 34 })).toEqual(['ATK Bonus']);
  });

  it('flags a substat below min', () => {
    expect(gearHasOutOfRangeStats({ ...legal, sub4_value: 100 })).toBe(true);
  });

  it('flags a gem bonus above the cap without treating main value as a substat', () => {
    expect(gearHasOutOfRangeStats({ ...legal, main_stat: 'atk', main_bonus: 86 })).toBe(true);
    expect(gearHasOutOfRangeStats({ ...legal, main_stat: 'atk', main_bonus: 85 })).toBe(false);
  });

  it('ignores empty sub slots', () => {
    expect(
      gearHasOutOfRangeStats({
        ...legal,
        sub4_stat: null,
        sub4_value: null,
      }),
    ).toBe(false);
  });
});
