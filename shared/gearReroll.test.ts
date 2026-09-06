import { describe, expect, it } from 'vitest';

import type { GearPrefix, GearSlot, GearStatKey } from './catalog.js';
import { rateGear } from './gearRating.js';
import { suggestReroll, type RerollableGear } from './gearReroll.js';

function piece(
  slot: GearSlot,
  setKey: string,
  main: GearStatKey,
  subs: { stat: GearStatKey; value: number }[],
  prefix: GearPrefix = 'none',
): RerollableGear {
  return {
    slot,
    set_key: setKey,
    prefix,
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

const garbageKeep = piece('bangle', 'cataclysm', 'atkBonus', [
  { stat: 'critRate', value: 10 },
  { stat: 'critDmg', value: 12 },
  { stat: 'atkSpd', value: 30 },
  { stat: 'atk', value: 150 },
]);

const oneWeakKeep = piece('bangle', 'cataclysm', 'atkBonus', [
  { stat: 'critRate', value: 28 },
  { stat: 'critDmg', value: 20 },
  { stat: 'atkSpd', value: 40 },
  { stat: 'atk', value: 150 },
]);

const missingEssential = piece(
  'bangle',
  'cataclysm',
  'atkBonus',
  [
    { stat: 'critDmg', value: 36 },
    { stat: 'atkSpd', value: 90 },
    { stat: 'atk', value: 400 },
    { stat: 'hpBonus', value: 20 },
  ],
  'ancient',
);

const offSetS = piece('bangle', 'fatality', 'atkBonus', [
  { stat: 'critRate', value: 28 },
  { stat: 'atkSpd', value: 40 },
  { stat: 'atk', value: 200 },
  { stat: 'hpBonus', value: 12 },
]);

describe('suggestReroll', () => {
  it('suggests a recasting hammer when a keep has garbage rolls on every line', () => {
    expect(rateGear(garbageKeep)).toMatchObject({ rank: 'A', ruleName: 'DPS ATK 1' });
    expect(suggestReroll(garbageKeep)).toEqual([
      expect.objectContaining({
        tool: 'recasting_hammer',
        projected: expect.objectContaining({ rank: 'SSS', ruleName: 'DPS ATK 1' }),
        subSlot: null,
      }),
    ]);
  });

  it('uses the advanced hammer on Ancient and Variant', () => {
    expect(suggestReroll({ ...garbageKeep, prefix: 'ancient' })[0]?.tool).toBe('advanced_recasting_hammer');
    expect(suggestReroll({ ...garbageKeep, prefix: 'variant' })[0]?.tool).toBe('advanced_recasting_hammer');
  });

  it('suggests a refining crystal when one line is the weak one', () => {
    expect(rateGear(oneWeakKeep)).toMatchObject({ rank: 'S', ruleName: 'DPS ATK 1' });
    const rows = suggestReroll(oneWeakKeep);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tool: 'refining_crystal',
      fromStat: 'atk',
      toStat: 'atk',
      projected: expect.objectContaining({ rank: 'SS' }),
    });
  });

  it('uses the advanced crystal on Ancient', () => {
    expect(suggestReroll({ ...oneWeakKeep, prefix: 'ancient' })[0]?.tool).toBe('advanced_refining_crystal');
  });

  it('does not also suggest a hammer when a crystal already gets SS+', () => {
    expect(suggestReroll(oneWeakKeep).some((row) => row.tool.includes('hammer'))).toBe(false);
  });

  it('suggests transmuting a leftover line into a missing essential on Ancient', () => {
    expect(rateGear(missingEssential)).toEqual({ rank: 'B', ruleName: null });
    const rows = suggestReroll(missingEssential);
    const gem = rows.find((row) => row.tool === 'transmutation_gem');
    expect(gem?.toStat).toBe('critRate');
    expect(['atk', 'hpBonus']).toContain(gem?.fromStat);
    expect(gem?.projected).toMatchObject({ rank: 'SS', ruleName: 'DPS ATK 1' });
  });

  it('suggests transmuting a dead line on an Ancient keep when the fill is already high', () => {
    const deadLine = piece(
      'bangle',
      'cataclysm',
      'atkBonus',
      [
        { stat: 'critRate', value: 28 },
        { stat: 'critDmg', value: 20 },
        { stat: 'atkSpd', value: 40 },
        { stat: 'def', value: 300 },
      ],
      'ancient',
    );
    expect(rateGear(deadLine)).toMatchObject({ rank: 'S', ruleName: 'DPS ATK 1' });
    const gem = suggestReroll(deadLine).find((row) => row.tool === 'transmutation_gem');
    expect(gem).toMatchObject({
      fromStat: 'def',
      projected: expect.objectContaining({ rank: 'SS', ruleName: 'DPS ATK 1' }),
    });
  });

  it('does not suggest a transmutation gem on normal mythic', () => {
    expect(suggestReroll({ ...missingEssential, prefix: 'none' })).toEqual([]);
  });

  it('does not suggest lifting a C piece into a keep', () => {
    expect(rateGear(offSetS)).toEqual({ rank: 'C', ruleName: null });
    expect(suggestReroll(offSetS)).toEqual([]);
    expect(suggestReroll({ ...offSetS, prefix: 'ancient' })).toEqual([]);
  });

  it('skips SSS keeps', () => {
    const god = piece('bangle', 'cataclysm', 'atkBonus', [
      { stat: 'critRate', value: 28 },
      { stat: 'critDmg', value: 36 },
      { stat: 'atkSpd', value: 90 },
      { stat: 'atk', value: 200 },
    ]);
    expect(rateGear(god).rank).toBe('SSS');
    expect(suggestReroll(god)).toEqual([]);
  });

  it('suggests Kukulkan spirit on a Calamity ATK DPS keep', () => {
    const calamity = piece('weapon', 'calamity', 'atk', [
      { stat: 'atkBonus', value: 22 },
      { stat: 'critRate', value: 22 },
      { stat: 'critDmg', value: 30 },
      { stat: 'atkSpd', value: 70 },
    ]);
    expect(rateGear(calamity).ruleName).toBe('ATK DPS Weapon');
    const row = suggestReroll(calamity).find((entry) => entry.tool === 'kukulkans_spirit');
    expect(row).toMatchObject({
      toSet: 'warlord',
      fromSet: 'calamity',
      needsBullion: false,
      projected: expect.objectContaining({ ruleName: 'ATK DPS Weapon' }),
    });
  });

  it('flags Eternal Bullion on Ancient and Variant ascends', () => {
    const calamity = piece(
      'weapon',
      'calamity',
      'atk',
      [
        { stat: 'atkBonus', value: 22 },
        { stat: 'critRate', value: 22 },
        { stat: 'critDmg', value: 30 },
        { stat: 'atkSpd', value: 70 },
      ],
      'ancient',
    );
    expect(suggestReroll(calamity).find((entry) => entry.tool === 'kukulkans_spirit')?.needsBullion).toBe(true);
    expect(
      suggestReroll({ ...calamity, prefix: 'variant' }).find((entry) => entry.tool === 'kukulkans_spirit')
        ?.needsBullion,
    ).toBe(true);
  });

  it('still lists a Calamity HP DPS keep whose Warlord swap drops the rule', () => {
    const calamity = piece('weapon', 'calamity', 'atk', [
      { stat: 'hpBonus', value: 22 },
      { stat: 'critRate', value: 22 },
      { stat: 'critDmg', value: 30 },
      { stat: 'atkSpd', value: 70 },
    ]);
    expect(rateGear(calamity).ruleName).toBe('HP DPS Weapon');
    const row = suggestReroll(calamity).find((entry) => entry.tool === 'kukulkans_spirit');
    expect(row?.projected.ruleName).toBeNull();
  });

  it('does not ascend a C piece on a spirit source set', () => {
    const junk = piece('weapon', 'calamity', 'atk', [
      { stat: 'def', value: 40 },
      { stat: 'hp', value: 300 },
      { stat: 'healingEffect', value: 5 },
      { stat: 'defBonus', value: 8 },
    ]);
    expect(rateGear(junk).ruleName).toBeNull();
    expect(suggestReroll(junk).some((entry) => entry.toSet != null)).toBe(false);
  });
});
