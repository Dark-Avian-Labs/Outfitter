import { describe, expect, it } from 'vitest';

import { applyArtifactOcr, parseArtifactOcr } from './artifactOcr.js';

const CATALOG = [
  { slug: 'auditore-blade', name: 'Auditore Blade' },
  { slug: 'golden-scarab', name: 'Golden Scarab' },
];

const EXCLUSIVE_TEXT = `
Mythic Artifact
Auditore Blade
Ezio Auditore Exclusive
+ 22/25
HP 4300+1840
ATK 1407+230
`;

const CLASS_LIMITED_TEXT = `
Mythic Artifact
Golden Scarab
Class-Limited
+ 25/25
HP 4650+2520
ATK 1497+335
ATK Spd. +49
`;

describe('parseArtifactOcr', () => {
  it('reads hero-exclusive HP/ATK rolls and promotion from max level', () => {
    expect(parseArtifactOcr(EXCLUSIVE_TEXT, CATALOG)).toEqual({
      catalog_slug: 'auditore-blade',
      level: 22,
      promotion: 5,
      hp_base: 4300,
      hp_bonus: 1840,
      atk_base: 1407,
      atk_bonus: 230,
      secondary_stat: null,
      secondary_value: null,
    });
  });

  it('reads a class-limited secondary and P5 from 25/25', () => {
    expect(parseArtifactOcr(CLASS_LIMITED_TEXT, CATALOG)).toEqual({
      catalog_slug: 'golden-scarab',
      level: 25,
      promotion: 5,
      hp_base: 4650,
      hp_bonus: 2520,
      atk_base: 1497,
      atk_bonus: 335,
      secondary_stat: 'atkSpd',
      secondary_value: 49,
    });
  });

  it('reads percent secondaries', () => {
    const parsed = parseArtifactOcr('Golden Scarab\nHP 1000+100\nATK 500+50\nATK Bonus +12%', CATALOG);
    expect(parsed.secondary_stat).toBe('atkBonus');
    expect(parsed.secondary_value).toBe(12);
  });

  it('does not treat ATK Speed as flat ATK', () => {
    const parsed = parseArtifactOcr('Golden Scarab\nHP 4650+2520\nATK 1497+335\nATK Spd. +49', CATALOG);
    expect(parsed.atk_base).toBe(1497);
    expect(parsed.secondary_stat).toBe('atkSpd');
  });

  it('reads HP and ATK when there is no bonus roll', () => {
    const text = `
Mythic Artifact
Amenhotep's Bow
Bayek Exclusive
+ 16/16
HP 3700
ATK 1227
`;
    expect(parseArtifactOcr(text, [{ slug: 'amenhoteps-bow', name: "Amenhotep's Bow" }])).toEqual({
      catalog_slug: 'amenhoteps-bow',
      level: 16,
      promotion: 2,
      hp_base: 3700,
      hp_bonus: 0,
      atk_base: 1227,
      atk_bonus: 0,
      secondary_stat: null,
      secondary_value: null,
    });
  });
});

describe('applyArtifactOcr', () => {
  it('fills a draft from parsed OCR', () => {
    const draft = {
      catalog_slug: '',
      level: 1,
      promotion: 0,
      hp_base: 0,
      hp_bonus: 0,
      atk_base: 0,
      atk_bonus: 0,
      secondary_stat: '' as const,
      secondary_value: 0,
    };
    expect(applyArtifactOcr(draft, parseArtifactOcr(CLASS_LIMITED_TEXT, CATALOG))).toMatchObject({
      catalog_slug: 'golden-scarab',
      level: 25,
      promotion: 5,
      hp_base: 4650,
      secondary_stat: 'atkSpd',
      secondary_value: 49,
    });
  });
});
