import { describe, expect, it } from 'vitest';

import { applyOcrStats, parseGearOcr, parseGearOcrText } from './gearOcr.js';

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
});
