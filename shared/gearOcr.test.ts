import { describe, expect, it } from 'vitest';

import { applyOcrStats, parseGearOcrText } from './gearOcr.js';

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
});

describe('applyOcrStats', () => {
  it('uses the first stat as main and switches slot when needed', () => {
    const next = applyOcrStats(
      {
        slot: 'weapon',
        set_key: 'calamity',
        main_stat: 'atk',
        main_value: 1,
        main_bonus: 12,
        substats: [{ stat: 'hp', value: 0 }],
      },
      parseGearOcrText(SCREENSHOT_TEXT),
    );
    expect(next.slot).toBe('bangle');
    expect(next.set_key).not.toBe('calamity');
    expect(next.main_stat).toBe('atkBonus');
    expect(next.main_value).toBe(66);
    expect(next.main_bonus).toBe(0);
    expect(next.substats[0]).toEqual({ stat: 'critRate', value: 17.5 });
    expect(next.substats).toHaveLength(4);
  });
});
