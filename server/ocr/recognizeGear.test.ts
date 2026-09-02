import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { closeOcrWorker, decodeGearScreenshot, recognizeGearStats } from './recognizeGear.js';

const screenshotPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../tests/fixtures/gear-screenshot.png',
);

describe('decodeGearScreenshot', () => {
  it('accepts a small PNG data URL', () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const decoded = decodeGearScreenshot(png);
    expect(Buffer.isBuffer(decoded)).toBe(true);
  });

  it('rejects missing or huge payloads', () => {
    expect(decodeGearScreenshot(null)).toBe('Paste a gear screenshot.');
    expect(decodeGearScreenshot('not-an-image')).toBe('Paste a PNG or JPEG screenshot.');
  });
});

describe('recognizeGearStats', () => {
  afterAll(async () => {
    await closeOcrWorker();
  });

  it.skipIf(!fs.existsSync(screenshotPath))(
    'reads the sample Watcher of Realms gear screenshot',
    async () => {
      const image = fs.readFileSync(screenshotPath);
      const result = await recognizeGearStats(image);
      expect(result.stats).toEqual([
        { stat: 'atkBonus', value: 66 },
        { stat: 'critRate', value: 17.5 },
        { stat: 'critDmg', value: 25.5 },
        { stat: 'atkSpd', value: 73 },
        { stat: 'rageRegen', value: 19 },
      ]);
    },
    30_000,
  );
});
