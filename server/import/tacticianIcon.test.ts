import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeTacticianClassIconSvg } from './tacticianIcon.js';

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe('writeTacticianClassIconSvg', () => {
  it('writes a rook svg under icons/classes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outfitter-tactician-'));
    tmpDirs.push(root);
    const dest = writeTacticianClassIconSvg(root);
    expect(dest).toBe(path.join(root, 'icons', 'classes', 'tactician.svg'));
    const svg = fs.readFileSync(dest, 'utf8');
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('fill="white"');
  });
});
