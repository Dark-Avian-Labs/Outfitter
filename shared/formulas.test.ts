import { describe, expect, it } from 'vitest';

import {
  attackIntervalDisplay,
  attackIntervalRaw,
  computeFinalStats,
  healingMultiplier,
  scaledStat,
} from './formulas.js';

describe('formulas', () => {
  it('applies percent to base, then adds flat', () => {
    expect(scaledStat(1000, 500, 155)).toBeCloseTo(1000 * 2.55 + 500);
  });

  it('matches the Oren sheet for HP and ATK when percent does not scale flats', () => {
    // Sheet from 2026-09-27. HP base is the catalog value. ATK base is his A3 sheet value.
    // Skin and collection (+200 HP, +50 ATK) are left out.
    expect(Math.round(scaledStat(21938, 10840, 23.5))).toBe(37933);
    expect(Math.round(scaledStat(5772, 4360, 264.8))).toBe(25416);
  });

  it('applies diminishing attack interval and never drops below 28% of base', () => {
    expect(attackIntervalRaw(2.6, 100)).toBeCloseTo(2.6);
    expect(attackIntervalDisplay(2.6, 100)).toBe(2.6);
    const fast = attackIntervalRaw(2.6, 1000);
    expect(fast).toBeGreaterThan(2.6 * 0.28);
    expect(fast).toBeLessThan(2.6);
  });

  it('soft-caps healing effect', () => {
    expect(healingMultiplier(0)).toBe(1);
    expect(healingMultiplier(100)).toBeCloseTo(1.75);
    expect(healingMultiplier(900)).toBeLessThan(2.5);
  });

  it('adds Glacier as 6% of final HP after ATK percent, not inside the flat bucket', () => {
    const bag = {
      flatHp: 0,
      flatAtk: 1000,
      flatDef: 0,
      hpPct: 0,
      atkPct: 50,
      defPct: 0,
      atkSpd: 0,
      critRate: 0,
      critDmg: 0,
      healingEffect: 0,
      rageRegen: 0,
      rageRegenAuto: 0,
      damageTaken: 0,
      aoeDamage: 0,
      stDamage: 0,
      basicAtkDamage: 0,
      damageAfterCrit: 0,
      damageAfterUlt: 0,
      critDmgAfterUlt: 0,
      damageOnUlt: 0,
      damageOnCrit: 0,
      damageAura: 0,
      glacier: true,
    };
    const stats = computeFinalStats(
      { hp: 10000, atk: 2000, def: 1000, atkInterval: 2, rrAuto: 10, rrAttack: 5, rrAttacked: 5 },
      bag,
    );
    expect(stats.hp).toBe(10000);
    expect(stats.atk).toBe(2000 * 1.5 + 1000 + 600);
  });
});
