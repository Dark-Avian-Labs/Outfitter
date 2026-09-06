import { describe, expect, it } from 'vitest';

import { applyOcrStats, mergeGearOcr, parseGearOcr, parseGearOcrText } from './gearOcr.js';

const SCREENSHOT_TEXT = `
Variant Mythic Gear
Variant: Hell's Lament Bangle
+16
T3
ATK Bonus                    66%
Crit. Rate                   17.5%
Crit. DMG                    25.5%
ATK Spd.                     73
Rage Regen                   19%
T3 Hell's Lament
`;

describe('parseGearOcrText', () => {
  it('reads main and four subs from a Watcher of Realms gear panel', () => {
    expect(parseGearOcrText(SCREENSHOT_TEXT)).toEqual([
      { stat: 'atkBonus', value: 66 },
      { stat: 'critRate', value: 17.5 },
      { stat: 'critDmg', value: 25.5 },
      { stat: 'atkSpd', value: 73 },
      { stat: 'rageRegen', value: 19 },
    ]);
  });

  it('reads a stats-only crop and split name/value lines', () => {
    const text = `
ATK Bonus
66%
Crit Rate
17.5%
Crit DMG 25.5%
ATK SPD 73
Rage Regen 19%
`;
    expect(parseGearOcrText(text).map((entry) => entry.stat)).toEqual([
      'atkBonus',
      'critRate',
      'critDmg',
      'atkSpd',
      'rageRegen',
    ]);
  });

  it('reads noisy tesseract output from a full gear panel', () => {
    const text = `
Weitie
7. ATK Bonus 66%
Crit. Rate 17.5%
i Crit. DMG 25.5%
4 ATK Spd. 73
% Rage Regen 19%
a Hells Lament
`;
    expect(parseGearOcrText(text)).toEqual([
      { stat: 'atkBonus', value: 66 },
      { stat: 'critRate', value: 17.5 },
      { stat: 'critDmg', value: 25.5 },
      { stat: 'atkSpd', value: 73 },
      { stat: 'rageRegen', value: 19 },
    ]);
  });

  it('reads comma-grouped HP values as thousands', () => {
    expect(parseGearOcrText('HP 3,025')).toEqual([{ stat: 'hp', value: 3025 }]);
  });

  it('does not treat ATK Speed as flat ATK', () => {
    expect(parseGearOcrText('ATK Spd. 73\nATK 412').map((entry) => entry.stat)).toEqual(['atkSpd', 'atk']);
  });

  it('maps in-game abbreviations when OCR turns the period into a comma', () => {
    expect(
      parseGearOcrText(`
Crit, Rate 21.5%
Crit, DMG 26.5%
ATK Spd. 69
`),
    ).toEqual([
      { stat: 'critRate', value: 21.5 },
      { stat: 'critDmg', value: 26.5 },
      { stat: 'atkSpd', value: 69 },
    ]);
  });

  it('maps glued ATK Spd without a space', () => {
    expect(parseGearOcrText('ATKSpd. 69')).toEqual([{ stat: 'atkSpd', value: 69 }]);
  });

  it('reads ATK Spd when OCR turns ATK into WK or Spd into 5pd', () => {
    expect(parseGearOcrText('4 WK Spd. 70')).toEqual([{ stat: 'atkSpd', value: 70 }]);
    expect(parseGearOcrText('ATK 5pd. 70')).toEqual([{ stat: 'atkSpd', value: 70 }]);
    expect(parseGearOcrText('WK\nSpd. 70')).toEqual([{ stat: 'atkSpd', value: 70 }]);
  });

  it('rejoins Crit. / Rate and ATK / Spd. when OCR splits at the period', () => {
    expect(
      parseGearOcrText(`
Crit.
Rate 21.5%
Crit.
DMG 26.5%
ATK
Spd. 69
`),
    ).toEqual([
      { stat: 'critRate', value: 21.5 },
      { stat: 'critDmg', value: 26.5 },
      { stat: 'atkSpd', value: 69 },
    ]);
  });
});

describe('parseGearOcr', () => {
  it('reads type, prefix, and set from a full gear panel title', () => {
    expect(parseGearOcr(SCREENSHOT_TEXT)).toMatchObject({
      slot: 'bangle',
      set_key: 'hells_lament',
      prefix: 'variant',
    });
  });

  it('reads an ancient weapon title', () => {
    expect(
      parseGearOcr(`
Ancient Mythic Gear
Ancient: Calamity Weapon
ATK 412
`),
    ).toMatchObject({
      slot: 'weapon',
      set_key: 'calamity',
      prefix: 'ancient',
    });
  });

  it('leaves type, prefix, and set empty on a stats-only crop', () => {
    expect(
      parseGearOcr(`
ATK Bonus 66%
Crit Rate 17.5%
`),
    ).toMatchObject({
      slot: null,
      set_key: null,
      prefix: null,
    });
  });

  it('matches Insight without the leading The, and ATK Spd glued to its value', () => {
    const parsed = parseGearOcr(`
Variant Mythic Gear
Variant: Insight Bangle+
Crit. Rate 60%
ATK Bonus 19.5%
Crit. DMG 33%
ATKSpd.79
DEF 256
`);
    expect(parsed).toMatchObject({
      slot: 'bangle',
      set_key: 'the_insight',
      prefix: 'variant',
    });
    expect(parsed.stats.map((entry) => entry.stat)).toEqual(['critRate', 'atkBonus', 'critDmg', 'atkSpd', 'def']);
    expect(parsed.stats[3]).toEqual({ stat: 'atkSpd', value: 79 });
  });

  it('matches Soulbound Arcana when the title wraps onto a second line', () => {
    expect(
      parseGearOcr(`
Ancient Mythic Gear
Ancient: Soulbound
Arcana Bangle
ATK Bonus 66%
`),
    ).toMatchObject({
      slot: 'bangle',
      set_key: 'soulbound_arcana',
      prefix: 'ancient',
    });
  });

  it('matches Soulbound when the wrapped Arcana line is garbage', () => {
    expect(
      parseGearOcr(`
AQ Ancient: Soulbound
LOW some
7. ATK Bonus 66%
4 WK Spd. 70
`),
    ).toMatchObject({
      set_key: 'soulbound_arcana',
      prefix: 'ancient',
    });
    expect(parseGearOcrText(`7. ATK Bonus 66%\n4 WK Spd. 70`)).toEqual([
      { stat: 'atkBonus', value: 66 },
      { stat: 'atkSpd', value: 70 },
    ]);
  });

  it('merges missing stats and title fields from a second OCR pass', () => {
    const column = parseGearOcr(`
Variant: Insight Bangle
Crit. Rate 60%
ATK Bonus 19.5%
Crit. DMG 33%
DEF 256
`);
    const sparse = parseGearOcr(`
ATK Spd. 79
DEF
256
`);
    const merged = mergeGearOcr(column, sparse);
    expect(merged.set_key).toBe('the_insight');
    expect(merged.slot).toBe('bangle');
    expect(merged.stats.map((entry) => entry.stat)).toEqual(['critRate', 'atkBonus', 'critDmg', 'def', 'atkSpd']);
  });
});

describe('applyOcrStats', () => {
  it('uses the title for type, set, and prefix when the screenshot has them', () => {
    const next = applyOcrStats(
      {
        slot: 'weapon',
        set_key: 'calamity',
        prefix: 'none',
        main_stat: 'atk',
        main_value: 1,
        main_bonus: 12,
        substats: [{ stat: 'hp', value: 0 }],
      },
      parseGearOcr(SCREENSHOT_TEXT),
    );
    expect(next.slot).toBe('bangle');
    expect(next.set_key).toBe('hells_lament');
    expect(next.prefix).toBe('variant');
    expect(next.main_stat).toBe('atkBonus');
    expect(next.main_value).toBe(66);
    expect(next.main_bonus).toBe(0);
    expect(next.substats[0]).toEqual({ stat: 'critRate', value: 17.5 });
    expect(next.substats).toHaveLength(4);
  });

  it('reads the green main-stat gem bonus', () => {
    const next = applyOcrStats(
      {
        slot: 'bangle',
        set_key: 'fatality',
        prefix: 'none',
        main_stat: 'atkBonus',
        main_value: 1,
        main_bonus: 0,
        substats: [{ stat: 'hp', value: 0 }],
      },
      parseGearOcr(`
Ancient Mythic Gear
Ancient: Wicked Vengeance Weapon
ATK                    1056 +70
ATK Bonus              26.5%
Crit. Rate             24%
Crit. DMG              36%
ATK Spd.               78
`),
    );
    expect(next.slot).toBe('weapon');
    expect(next.set_key).toBe('wicked_vengeance');
    expect(next.prefix).toBe('ancient');
    expect(next.main_stat).toBe('atk');
    expect(next.main_value).toBe(1056);
    expect(next.main_bonus).toBe(70);
    expect(next.substats[0]).toEqual({ stat: 'atkBonus', value: 26.5 });
  });

  it('treats a second main-stat number as the bonus when the plus sign is lost', () => {
    expect(parseGearOcr('ATK 1056 70').stats[0]).toEqual({
      stat: 'atk',
      value: 1056,
      bonus: 70,
    });
  });

  it('reads ATK 1056 as the weapon main when OCR lists it after the subs', () => {
    const panel = `
Mythic Gear
Astral Guardian Weapon
+16
T3
HP Bonus               16%
DEF Bonus              22.5%
HP                     280
DEF                    205
ATK                    1056
`;
    const parsed = parseGearOcr(panel);
    expect(parsed).toMatchObject({
      slot: 'weapon',
      set_key: 'astral_guardian',
    });
    expect(parsed.stats.map((entry) => ({ stat: entry.stat, value: entry.value }))).toEqual([
      { stat: 'atk', value: 1056 },
      { stat: 'hpBonus', value: 16 },
      { stat: 'defBonus', value: 22.5 },
      { stat: 'hp', value: 280 },
      { stat: 'def', value: 205 },
    ]);
    const next = applyOcrStats(
      {
        slot: 'bangle',
        set_key: 'fatality',
        prefix: 'none',
        main_stat: 'atkBonus',
        main_value: 1,
        main_bonus: 0,
        substats: [{ stat: 'hp', value: 0 }],
      },
      parsed,
    );
    expect(next.slot).toBe('weapon');
    expect(next.set_key).toBe('astral_guardian');
    expect(next.main_stat).toBe('atk');
    expect(next.main_value).toBe(1056);
    expect(next.substats.slice(0, 4)).toEqual([
      { stat: 'hpBonus', value: 16 },
      { stat: 'defBonus', value: 22.5 },
      { stat: 'hp', value: 280 },
      { stat: 'def', value: 205 },
    ]);
  });

  it('does not treat Astral Guardian as the Guardian set', () => {
    expect(parseGearOcr('Mythic Gear\nAstral Guardian Weapon\nATK 1056').set_key).toBe('astral_guardian');
    expect(parseGearOcr('Mythic Gear\nGuardian Bangle\nATK Bonus 60%').set_key).toBe('guardian');
  });

  it('keeps a Lights Grace weapon when OCR reads ATK after the bonus line', () => {
    const parsed = parseGearOcr(`
Mythic Gear
Light's Grace Weapon
ATK Bonus 7 3.5%
ATK Spd. 42
DEF Bonus 24%
HP Bonus 15%
ATK 1056
`);
    expect(parsed).toMatchObject({ slot: 'weapon', set_key: 'lights_grace' });
    expect(parsed.stats.map((entry) => ({ stat: entry.stat, value: entry.value }))).toEqual([
      { stat: 'atk', value: 1056 },
      { stat: 'atkBonus', value: 3.5 },
      { stat: 'atkSpd', value: 42 },
      { stat: 'defBonus', value: 24 },
      { stat: 'hpBonus', value: 15 },
    ]);
    const next = applyOcrStats(
      {
        slot: 'bangle',
        set_key: 'fatality',
        prefix: 'none',
        main_stat: 'atkBonus',
        main_value: 1,
        main_bonus: 0,
        substats: [{ stat: 'hp', value: 0 }],
      },
      parsed,
    );
    expect(next.slot).toBe('weapon');
    expect(next.set_key).toBe('lights_grace');
    expect(next.main_stat).toBe('atk');
    expect(next.main_value).toBe(1056);
    expect(next.substats.slice(0, 4)).toEqual([
      { stat: 'atkBonus', value: 3.5 },
      { stat: 'atkSpd', value: 42 },
      { stat: 'defBonus', value: 24 },
      { stat: 'hpBonus', value: 15 },
    ]);
  });

  it('promotes ATK onto a weapon after a second OCR pass finds the main', () => {
    const merged = mergeGearOcr(
      parseGearOcr(`
Mythic Gear
Light's Grace Weapon
ATK Bonus 3.5%
ATK Spd. 42
DEF Bonus 24%
HP Bonus 15%
`),
      parseGearOcr(`
ATK 1056
ATK Bonus 3.5%
`),
    );
    expect(merged.slot).toBe('weapon');
    expect(merged.set_key).toBe('lights_grace');
    expect(merged.stats[0]).toEqual({ stat: 'atk', value: 1056 });
    const next = applyOcrStats(
      {
        slot: 'bangle',
        set_key: 'fatality',
        prefix: 'none',
        main_stat: 'atkBonus',
        main_value: 1,
        main_bonus: 0,
        substats: [{ stat: 'hp', value: 0 }],
      },
      merged,
    );
    expect(next.slot).toBe('weapon');
    expect(next.set_key).toBe('lights_grace');
    expect(next.main_stat).toBe('atk');
    expect(next.main_value).toBe(1056);
  });
});

describe('armor HP main OCR', () => {
  const annihilatingPanel = `
+16
Ancient Mythic Gear
Ancient: Annihilating Might Breastplate+
HP 2100
3600
ATK Bonus 25.5%
Crit. Rate 19%
Crit. DMG 37.5%
DEF Bonus 21%
`;

  it('prefers the HP value above substat range when OCR emits 2100 and 3600', () => {
    expect(parseGearOcr(annihilatingPanel).stats[0]).toEqual({ stat: 'hp', value: 3600 });
    expect(parseGearOcr(annihilatingPanel).slot).toBe('armor');
  });

  it('uses 3600 from elsewhere in the panel when the HP line is only 2100', () => {
    expect(
      parseGearOcr(`
HP 2100
ATK Bonus 25.5%
3600
Crit. Rate 19%
`).stats[0],
    ).toEqual({ stat: 'hp', value: 3600 });
  });

  it('corrects +16 armor HP 2100 when 3600 is missing from the text', () => {
    expect(
      parseGearOcr(`
+16
Ancient: Salvation Breastplate+
HP 2100
ATK Spd 61
Rage Regen 16.5%
Healing Effect 23
ATK 391
`).stats[0],
    ).toEqual({ stat: 'hp', value: 3600 });
  });

  it('reads HP when the heart icon glues as a letter prefix', () => {
    expect(parseGearOcrText('YHP 3600')).toEqual([{ stat: 'hp', value: 3600 }]);
  });

  it('replaces a first-pass HP 2100 with a later-pass 3600', () => {
    const merged = mergeGearOcr(parseGearOcr('HP 2100\nATK Bonus 25.5%'), parseGearOcr('HP 3600\nATK Bonus 25.5%'));
    expect(merged.stats[0]).toEqual({ stat: 'hp', value: 3600 });
  });

  it('prefers HP 3960 over a glued 23515 main', () => {
    expect(
      parseGearOcr(`
Mythic Gear
Constance Breastplate
HP 23515 3960
ATK Bonus 125.5%
Healing Effect 23
Crit. Rate 22.5%
ATK 502
`).stats.map((entry) => ({ stat: entry.stat, value: entry.value })),
    ).toEqual([
      { stat: 'hp', value: 3960 },
      { stat: 'atkBonus', value: 25.5 },
      { stat: 'healingEffect', value: 23 },
      { stat: 'critRate', value: 22.5 },
      { stat: 'atk', value: 502 },
    ]);
  });

  it('replaces an over-cap first-pass HP with 3960 from a later pass', () => {
    const merged = mergeGearOcr(parseGearOcr('HP 23515\nATK Bonus 25.5%'), parseGearOcr('HP 3960\nATK Bonus 25.5%'));
    expect(merged.stats[0]).toEqual({ stat: 'hp', value: 3960 });
  });
});

describe('exclusive gear OCR', () => {
  const vierna = [{ slug: 'vierna', name: 'Vierna' }] as const;
  const exclusivePanel = `
Mythic Gear
Vierna's Bangle
VIERNA
Exclusive
ATK Bonus
66%
Crit. Rate 22%
Crit. DMG 36.5%
ATK Spd. 71
Rage Regen 18.5%
`;

  it('skips Exclusive between the main-stat label and its value', () => {
    expect(parseGearOcr(exclusivePanel, vierna).stats).toEqual([
      { stat: 'atkBonus', value: 66 },
      { stat: 'critRate', value: 22 },
      { stat: 'critDmg', value: 36.5 },
      { stat: 'atkSpd', value: 71 },
      { stat: 'rageRegen', value: 18.5 },
    ]);
  });

  it('reads the hero from the exclusive banner and leaves set empty', () => {
    expect(parseGearOcr(exclusivePanel, vierna)).toMatchObject({
      slot: 'bangle',
      set_key: null,
      prefix: 'none',
      exclusive_hero_slug: 'vierna',
    });
  });

  it('fills hero exclusive without inventing a set', () => {
    const next = applyOcrStats(
      {
        slot: 'weapon',
        set_key: 'calamity',
        prefix: 'none',
        main_stat: 'atk',
        main_value: 1,
        main_bonus: 0,
        substats: [{ stat: 'hp', value: 0 }],
        exclusive_hero_slug: '',
        exclusive_faction: 'gold',
      },
      parseGearOcr(exclusivePanel, vierna),
    );
    expect(next.slot).toBe('bangle');
    expect(next.exclusive_hero_slug).toBe('vierna');
    expect(next.exclusive_faction).toBe('');
    expect(next.main_stat).toBe('atkBonus');
    expect(next.main_value).toBe(66);
  });

  const exclusiveRing = `
Mythic Gear
The Chaos Dominion Ring
THE CHAOS DOMINION
Exclusive
Crit. DMG
72%
ATK Bonus 13.5%
ATK Spd. 50
DEF Bonus 19%
HP Bonus 12%
`;

  it('reads the faction from a ring name and exclusive banner', () => {
    expect(parseGearOcr(exclusiveRing)).toMatchObject({
      slot: 'ring',
      set_key: null,
      prefix: 'none',
      exclusive_hero_slug: null,
      exclusive_faction: 'chaos_dominion',
    });
    expect(parseGearOcr(exclusiveRing).stats).toEqual([
      { stat: 'critDmg', value: 72 },
      { stat: 'atkBonus', value: 13.5 },
      { stat: 'atkSpd', value: 50 },
      { stat: 'defBonus', value: 19 },
      { stat: 'hpBonus', value: 12 },
    ]);
  });

  it('fills faction exclusive without inventing a set', () => {
    const next = applyOcrStats(
      {
        slot: 'weapon',
        set_key: 'calamity',
        prefix: 'none',
        main_stat: 'atk',
        main_value: 1,
        main_bonus: 0,
        substats: [{ stat: 'hp', value: 0 }],
        exclusive_hero_slug: 'vierna',
        exclusive_faction: '',
      },
      parseGearOcr(exclusiveRing),
    );
    expect(next.slot).toBe('ring');
    expect(next.exclusive_faction).toBe('chaos_dominion');
    expect(next.exclusive_hero_slug).toBe('');
    expect(next.main_stat).toBe('critDmg');
    expect(next.main_value).toBe(72);
  });

  it('does not treat Infernal Blast exclusive as Infernal Roar', () => {
    expect(
      parseGearOcr(`
Mythic Gear
Infernal Blast Ring
INFERNAL BLAST
Exclusive
ATK Bonus 66%
`),
    ).toMatchObject({
      slot: 'ring',
      set_key: null,
      exclusive_faction: 'infernal_blast',
    });
  });
});
