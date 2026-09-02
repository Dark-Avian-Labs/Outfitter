import { describe, expect, it } from 'vitest';

import { GEAR_SLOTS } from './catalog.js';
import { optimizeLoadouts, type OptimizerRequest } from './optimizer.js';
import type { GearPieceInput } from './pieceStats.js';

const hero = {
  hp: 10000,
  atk: 2000,
  def: 1000,
  atkInterval: 2.6,
  rrAuto: 10,
  rrAttack: 8,
  rrAttacked: 6,
};

function piece(
  id: number,
  slot: GearPieceInput['slot'],
  setKey: string,
  extras: Partial<GearPieceInput> = {},
): GearPieceInput {
  return {
    id,
    slot,
    setKey,
    mainStat: slot === 'armor' ? 'hp' : slot === 'weapon' ? 'atk' : 'atkBonus',
    mainValue: slot === 'armor' ? 2000 : slot === 'weapon' ? 400 : 40,
    mainBonus: 0,
    substats: [],
    equippedHeroSlug: null,
    ...extras,
  };
}

describe('optimizeLoadouts', () => {
  it('returns empty when a slot is missing', () => {
    const request: OptimizerRequest = {
      hero,
      pieces: [piece(1, 'weapon', 'calamity')],
      weights: { atk: 100 },
      minimums: {},
      forceSets: false,
    };
    expect(optimizeLoadouts(request)).toEqual([]);
  });

  it('keeps pieces that reach a crit rate floor and ranks by ATK', () => {
    const request: OptimizerRequest = {
      hero,
      pieces: [
        piece(1, 'weapon', 'calamity', { substats: [{ stat: 'atk', value: 400 }] }),
        piece(2, 'weapon', 'calamity', { substats: [{ stat: 'atk', value: 100 }] }),
        piece(3, 'armor', 'calamity'),
        piece(4, 'bangle', 'the_insight', {
          mainStat: 'critRate',
          mainValue: 30,
          substats: [{ stat: 'critRate', value: 20 }],
        }),
        piece(5, 'amulet', 'the_insight', { substats: [{ stat: 'critRate', value: 20 }] }),
        piece(6, 'ring', 'the_insight', { substats: [{ stat: 'critRate', value: 15 }] }),
        piece(7, 'bangle', 'fatality', { substats: [{ stat: 'atkBonus', value: 30 }] }),
        piece(8, 'amulet', 'fatality', { substats: [{ stat: 'atkBonus', value: 30 }] }),
        piece(9, 'ring', 'fatality', { substats: [{ stat: 'atkBonus', value: 30 }] }),
      ],
      weights: { atk: 100 },
      minimums: { critRate: 95 },
      forceSets: false,
    };
    const results = optimizeLoadouts(request);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.stats.critRate).toBeGreaterThanOrEqual(95);
    expect(results[0]?.pieces.find((entry) => entry.slot === 'weapon')?.id).toBe(1);
  });

  it('excludes other heroes equipped gear unless includeEquippedHeroSlug matches', () => {
    const pieces = [
      piece(1, 'weapon', 'calamity', { equippedHeroSlug: 'other' }),
      piece(2, 'weapon', 'calamity'),
      piece(3, 'armor', 'calamity'),
      piece(4, 'bangle', 'fatality'),
      piece(5, 'amulet', 'fatality'),
      piece(6, 'ring', 'fatality'),
    ];
    const blocked = optimizeLoadouts({
      hero,
      pieces,
      weights: { atk: 10 },
      minimums: {},
      forceSets: false,
    });
    expect(blocked[0]?.pieces.some((entry) => entry.id === 1)).toBe(false);

    const included = optimizeLoadouts({
      hero,
      pieces,
      weights: { atk: 10 },
      minimums: {},
      forceSets: false,
      includeEquippedHeroSlug: 'other',
    });
    expect(included[0]?.pieces.some((entry) => entry.id === 1)).toBe(true);
  });

  it('returns empty when Force sets cannot fill every slot from those sets', () => {
    const results = optimizeLoadouts({
      hero,
      pieces: [
        piece(1, 'weapon', 'calamity'),
        piece(2, 'armor', 'whirlwind'),
        piece(3, 'bangle', 'fatality'),
        piece(4, 'amulet', 'fatality'),
        piece(5, 'ring', 'fatality'),
      ],
      weights: { atk: 100 },
      minimums: {},
      desiredLeftSet: 'calamity',
      desiredRightSet: 'fatality',
      forceSets: true,
    });
    expect(results).toEqual([]);
  });

  it('keeps a high-HP armor that an ATK-only beam would drop when combos exceed 2M', () => {
    const pieces: GearPieceInput[] = [];
    let id = 1;
    let hpArmorId = 0;
    for (const slot of GEAR_SLOTS) {
      for (let index = 0; index < 20; index += 1) {
        const isHpArmor = slot === 'armor' && index === 19;
        if (isHpArmor) hpArmorId = id;
        pieces.push(
          piece(id, slot, slot === 'weapon' || slot === 'armor' ? 'calamity' : 'fatality', {
            mainValue: isHpArmor ? 4000 : slot === 'armor' ? 2000 : slot === 'weapon' ? 400 : 40,
            substats: isHpArmor ? [] : [{ stat: 'atk', value: 500 - index }],
          }),
        );
        id += 1;
      }
    }
    const results = optimizeLoadouts({
      hero,
      pieces,
      weights: { atk: 100 },
      minimums: { hp: 13000 },
      forceSets: false,
    });
    expect(hpArmorId).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.stats.hp).toBeGreaterThanOrEqual(13000);
    expect(results[0]?.pieces.find((entry) => entry.slot === 'armor')?.id).toBe(hpArmorId);
  }, 20_000);
});
