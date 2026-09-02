import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { tessWorkerOptionsFor } from './tessdata.js';

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe('tessWorkerOptionsFor', () => {
  it('uses bundled traineddata when the file exists', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outfitter-tess-'));
    tmpDirs.push(root);
    const bundledDir = path.join(root, 'bundled');
    fs.mkdirSync(bundledDir, { recursive: true });
    fs.writeFileSync(path.join(bundledDir, 'eng.traineddata'), 'local');
    expect(tessWorkerOptionsFor(bundledDir, path.join(root, 'cache'))).toEqual({
      langPath: bundledDir,
      gzip: false,
      cacheMethod: 'none',
    });
  });

  it('points Tesseract at a cache dir when no bundled file exists', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outfitter-tess-'));
    tmpDirs.push(root);
    const cacheDir = path.join(root, 'cache');
    expect(tessWorkerOptionsFor(path.join(root, 'missing'), cacheDir)).toEqual({
      cachePath: cacheDir,
      gzip: true,
      cacheMethod: 'write',
    });
    expect(fs.existsSync(cacheDir)).toBe(true);
  });
});
