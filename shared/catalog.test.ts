import { describe, expect, it } from 'vitest';

import {
  artifactRarityColor,
  gaugeColor,
  gaugeRatio,
  gearHasOutOfRangeStats,
  isArtifactSecondaryInRange,
  maxLevelForPromotion,
  outOfRangeArtifactLabels,
  outOfRangeGearLabels,
  promotionFromMaxLevel,
} from './catalog.js';

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
    expect(gearHasOutOfRangeStats({ ...legal, main_stat: 'atk', main_value: 1056, main_bonus: 86 })).toBe(true);
    expect(gearHasOutOfRangeStats({ ...legal, main_stat: 'atk', main_value: 1056, main_bonus: 85 })).toBe(false);
  });

  it('flags an armor HP main above the T3 +16 gem cap', () => {
    expect(outOfRangeGearLabels({ ...legal, main_stat: 'hp', main_value: 23515, main_bonus: 10 })).toEqual(['HP']);
    expect(gearHasOutOfRangeStats({ ...legal, main_stat: 'hp', main_value: 3960, main_bonus: 0 })).toBe(false);
  });

  it('accepts a +16 ATK Speed amulet main of 220', () => {
    expect(gearHasOutOfRangeStats({ ...legal, main_stat: 'atkSpd', main_value: 220, main_bonus: 0 })).toBe(false);
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

describe('artifact promotion', () => {
  it('maps max level bands to promotion 0-5', () => {
    expect(promotionFromMaxLevel(1)).toBe(0);
    expect(promotionFromMaxLevel(10)).toBe(0);
    expect(promotionFromMaxLevel(11)).toBe(1);
    expect(promotionFromMaxLevel(13)).toBe(1);
    expect(promotionFromMaxLevel(14)).toBe(2);
    expect(promotionFromMaxLevel(16)).toBe(2);
    expect(promotionFromMaxLevel(17)).toBe(3);
    expect(promotionFromMaxLevel(19)).toBe(3);
    expect(promotionFromMaxLevel(20)).toBe(4);
    expect(promotionFromMaxLevel(22)).toBe(4);
    expect(promotionFromMaxLevel(23)).toBe(5);
    expect(promotionFromMaxLevel(25)).toBe(5);
  });

  it('returns the max level for each promotion', () => {
    expect(maxLevelForPromotion(0)).toBe(10);
    expect(maxLevelForPromotion(5)).toBe(25);
    expect(maxLevelForPromotion(99)).toBe(25);
  });

  it('maps catalog rarity to a pip color and falls back to gold', () => {
    expect(artifactRarityColor('mythic')).toBe('var(--color-rarity-orange)');
    expect(artifactRarityColor('legendary')).toBe('var(--color-rarity-gold)');
    expect(artifactRarityColor('', 6)).toBe('var(--color-rarity-orange)');
    expect(artifactRarityColor('')).toBe('var(--color-rarity-gold)');
  });

  it('checks artifact secondary rolls against catalog ranges', () => {
    expect(isArtifactSecondaryInRange('atkSpd', 49)).toBe(true);
    expect(isArtifactSecondaryInRange('atkSpd', 9)).toBe(false);
    expect(isArtifactSecondaryInRange('atkBonus', 15)).toBe(true);
    expect(isArtifactSecondaryInRange('atkBonus', 16)).toBe(false);
  });

  it('flags artifact HP/ATK rolls outside rarity bands', () => {
    const mythic = {
      rarity: 'mythic',
      hp_base: 4650,
      hp_bonus: 0,
      atk_base: 1497,
      atk_bonus: 0,
      secondary_stat: null,
      secondary_value: null,
    };
    expect(outOfRangeArtifactLabels(mythic)).toEqual([]);
    expect(outOfRangeArtifactLabels({ ...mythic, hp_base: 3700, atk_base: 1227 })).toEqual([]);
    expect(outOfRangeArtifactLabels({ ...mythic, hp_base: 2199 })).toEqual(['HP']);
    expect(outOfRangeArtifactLabels({ ...mythic, hp_bonus: 49 })).toEqual(['HP bonus']);
    expect(outOfRangeArtifactLabels({ ...mythic, hp_bonus: 50, atk_bonus: 25 })).toEqual([]);
    expect(
      outOfRangeArtifactLabels({
        rarity: 'legendary',
        hp_base: 1950,
        hp_bonus: 0,
        atk_base: 623,
        atk_bonus: 0,
        secondary_stat: null,
        secondary_value: null,
      }),
    ).toEqual([]);
    expect(
      outOfRangeArtifactLabels({
        rarity: 'legendary',
        hp_base: 4650,
        hp_bonus: 0,
        atk_base: 1497,
        atk_bonus: 0,
        secondary_stat: null,
        secondary_value: null,
      }),
    ).toEqual(['HP', 'ATK']);
  });
});

describe('substat gauges', () => {
  it('places 26% DEF just before the 80% gold notch', () => {
    const ratio = gaugeRatio('defBonus', 26);
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(0.8);
    expect(gaugeColor(ratio)).toBe('var(--color-rarity-purple)');
  });

  it('turns gold past the last notch', () => {
    expect(gaugeRatio('atkBonus', 27)).toBeGreaterThan(0.8);
    expect(gaugeColor(gaugeRatio('atkBonus', 27))).toBe('var(--color-rarity-gold)');
  });
});
