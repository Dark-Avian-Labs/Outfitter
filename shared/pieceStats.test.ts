import { describe, expect, it } from 'vitest';

import { artifactStatBag, loadoutStatBag, type GearPieceInput } from './pieceStats.js';

function piece(slot: GearPieceInput['slot']): GearPieceInput {
  return {
    id: 1,
    slot,
    setKey: 'calamity',
    mainStat: slot === 'armor' ? 'hp' : 'atk',
    mainValue: slot === 'armor' ? 1000 : 200,
    mainBonus: 0,
    substats: [],
    equippedHeroSlug: null,
  };
}

describe('artifactStatBag', () => {
  it('adds flat HP/ATK and a secondary percent', () => {
    const bag = artifactStatBag({
      hp_base: 4300,
      hp_bonus: 1840,
      atk_base: 1407,
      atk_bonus: 230,
      secondary_stat: 'atkBonus',
      secondary_value: 12,
    });
    expect(bag.flatHp).toBe(6140);
    expect(bag.flatAtk).toBe(1637);
    expect(bag.atkPct).toBe(12);
  });
});

describe('loadoutStatBag artifact', () => {
  it('folds artifact flats into the gear bag', () => {
    const bag = loadoutStatBag([piece('weapon'), piece('armor')], {
      hp_base: 100,
      hp_bonus: 50,
      atk_base: 20,
      atk_bonus: 10,
      secondary_stat: 'atkSpd',
      secondary_value: 49,
    });
    expect(bag.flatHp).toBe(1150);
    expect(bag.flatAtk).toBe(230);
    expect(bag.atkSpd).toBe(49);
  });
});
