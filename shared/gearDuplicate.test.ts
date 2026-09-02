import { describe, expect, it } from 'vitest';

import { findDuplicateGear, gearIdentityKey, identityFromGearRow } from './gearDuplicate.js';

const calamityWeapon = {
  slot: 'weapon',
  set_key: 'calamity',
  main_stat: 'atk',
  main_value: 420,
  main_bonus: 80,
  substats: [
    { stat: 'critRate', value: 17.5 },
    { stat: 'critDmg', value: 25.5 },
    { stat: 'atkSpd', value: 73 },
    { stat: 'rageRegen', value: 19 },
  ],
};

describe('gearIdentityKey', () => {
  it('ignores substat order and empty rolls', () => {
    const a = gearIdentityKey(calamityWeapon);
    const b = gearIdentityKey({
      ...calamityWeapon,
      substats: [
        { stat: 'rageRegen', value: 19 },
        { stat: 'atkSpd', value: 73 },
        { stat: 'critDmg', value: 25.5 },
        { stat: 'critRate', value: 17.5 },
        { stat: 'hp', value: 0 },
      ],
    });
    expect(a).toBe(b);
  });

  it('treats a different set or type as a different piece', () => {
    expect(gearIdentityKey({ ...calamityWeapon, set_key: 'glacier' })).not.toBe(gearIdentityKey(calamityWeapon));
    expect(gearIdentityKey({ ...calamityWeapon, slot: 'armor' })).not.toBe(gearIdentityKey(calamityWeapon));
  });

  it('treats different main or substat values as a different piece', () => {
    expect(gearIdentityKey({ ...calamityWeapon, main_value: 421 })).not.toBe(gearIdentityKey(calamityWeapon));
    expect(
      gearIdentityKey({
        ...calamityWeapon,
        substats: calamityWeapon.substats.map((entry, index) => (index === 0 ? { ...entry, value: 18 } : entry)),
      }),
    ).not.toBe(gearIdentityKey(calamityWeapon));
  });
});

describe('findDuplicateGear', () => {
  const stash = [
    {
      id: 1,
      ...identityFromGearRow({
        ...calamityWeapon,
        sub1_stat: 'critRate',
        sub1_value: 17.5,
        sub2_stat: 'critDmg',
        sub2_value: 25.5,
        sub3_stat: 'atkSpd',
        sub3_value: 73,
        sub4_stat: 'rageRegen',
        sub4_value: 19,
      }),
    },
  ];

  it('finds an exact type/set/stats match', () => {
    expect(findDuplicateGear(stash, calamityWeapon)?.id).toBe(1);
  });

  it('ignores the piece being edited', () => {
    expect(findDuplicateGear(stash, calamityWeapon, 1)).toBeUndefined();
  });
});
