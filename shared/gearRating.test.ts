import { describe, expect, it } from 'vitest';

import type { GearSlot, GearStatKey } from './catalog.js';
import { KEEP_RULES, rateGear, type RateableGear } from './gearRating.js';

function piece(
  slot: GearSlot,
  setKey: string,
  main: GearStatKey,
  subs: { stat: GearStatKey; value: number }[],
): RateableGear {
  return {
    slot,
    set_key: setKey,
    main_stat: main,
    sub1_stat: subs[0]?.stat ?? null,
    sub1_value: subs[0]?.value ?? null,
    sub2_stat: subs[1]?.stat ?? null,
    sub2_value: subs[1]?.value ?? null,
    sub3_stat: subs[2]?.stat ?? null,
    sub3_value: subs[2]?.value ?? null,
    sub4_stat: subs[3]?.stat ?? null,
    sub4_value: subs[3]?.value ?? null,
  };
}

describe('rateGear', () => {
  it('returns D and no rule when rolls are also junk', () => {
    expect(
      rateGear(
        piece('ring', 'fatality', 'atkBonus', [
          { stat: 'atk', value: 80 },
          { stat: 'def', value: 40 },
          { stat: 'hp', value: 300 },
          { stat: 'healingEffect', value: 5 },
        ]),
      ),
    ).toEqual({ rank: 'D', ruleName: null });
  });

  it('rates off-set SS+ rolls as B with no rule name', () => {
    expect(
      rateGear(
        piece('bangle', 'fatality', 'atkBonus', [
          { stat: 'critRate', value: 28 },
          { stat: 'atkSpd', value: 90 },
          { stat: 'atk', value: 500 },
          { stat: 'hpBonus', value: 30 },
        ]),
      ),
    ).toEqual({ rank: 'B', ruleName: null });
  });

  it('rates off-set S rolls as C with no rule name', () => {
    expect(
      rateGear(
        piece('bangle', 'fatality', 'atkBonus', [
          { stat: 'critRate', value: 28 },
          { stat: 'atkSpd', value: 40 },
          { stat: 'atk', value: 200 },
          { stat: 'hpBonus', value: 12 },
        ]),
      ),
    ).toEqual({ rank: 'C', ruleName: null });
  });

  it('rates a high DPS ATK 1 bangle as SSS', () => {
    expect(
      rateGear(
        piece('bangle', 'cataclysm', 'atkBonus', [
          { stat: 'critRate', value: 28 },
          { stat: 'critDmg', value: 36 },
          { stat: 'atkSpd', value: 90 },
          { stat: 'atk', value: 200 },
        ]),
      ),
    ).toMatchObject({ rank: 'SSS', ruleName: 'DPS ATK 1' });
  });

  it('does not treat exclusive or prefix as a keep, only the filter', () => {
    expect(
      rateGear(
        piece('ring', 'fatality', 'critDmg', [
          { stat: 'atkBonus', value: 10 },
          { stat: 'atkSpd', value: 40 },
          { stat: 'defBonus', value: 20 },
          { stat: 'hpBonus', value: 12 },
        ]),
      ).ruleName,
    ).toBeNull();
  });

  it('uses ATK% as essential on ATK No Crit Weapon', () => {
    const hit = rateGear(
      piece('weapon', 'calamity', 'atk', [
        { stat: 'atkBonus', value: 20 },
        { stat: 'critDmg', value: 30 },
        { stat: 'atkSpd', value: 60 },
        { stat: 'hpBonus', value: 15 },
      ]),
    );
    expect(hit.ruleName).toBe('ATK No Crit Weapon');
    expect(hit.rank).not.toBe('D');
  });

  it('rejects Greyfang from Tank 2', () => {
    expect(
      rateGear(
        piece('ring', 'greyfang', 'hpBonus', [
          { stat: 'defBonus', value: 20 },
          { stat: 'hp', value: 2000 },
          { stat: 'def', value: 200 },
          { stat: 'rageRegen', value: 20 },
        ]),
      ).ruleName,
    ).toBeNull();
  });

  it('hits Tank Chest when both DEF% and HP% are subs', () => {
    expect(
      rateGear(
        piece('armor', 'goldmane', 'hp', [
          { stat: 'defBonus', value: 15 },
          { stat: 'hpBonus', value: 18 },
          { stat: 'def', value: 100 },
          { stat: 'rageRegen', value: 10 },
        ]),
      ).ruleName,
    ).toBe('Tank Chest');
  });

  it('does not name a rule when an essential is missing, but still ranks the rolls', () => {
    expect(
      rateGear(
        piece('bangle', 'cataclysm', 'atkBonus', [
          { stat: 'critDmg', value: 36 },
          { stat: 'atkSpd', value: 90 },
          { stat: 'atk', value: 400 },
          { stat: 'hpBonus', value: 20 },
        ]),
      ),
    ).toEqual({ rank: 'B', ruleName: null });
  });
});

describe('KEEP_RULES', () => {
  it('has 12 right and 16 left community filters', () => {
    expect(KEEP_RULES.filter((rule) => rule.side === 'right')).toHaveLength(12);
    expect(KEEP_RULES.filter((rule) => rule.side === 'left')).toHaveLength(16);
  });
});
