import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { afterEach, describe, expect, it } from 'vitest';

import { ensureEngTrainedData } from './tessdata.js';

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe('ensureEngTrainedData', () => {
  it('returns an existing file without fetching', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outfitter-tess-'));
    tmpDirs.push(dir);
    const dest = path.join(dir, 'eng.traineddata');
    fs.writeFileSync(dest, 'already-here');
    let fetches = 0;
    const found = await ensureEngTrainedData({
      destFile: dest,
      searchPaths: [dest],
      fetchImpl: async () => {
        fetches += 1;
        throw new Error('should not fetch');
      },
    });
    expect(found).toBe(dest);
    expect(fetches).toBe(0);
  });

  it('downloads and gunzips traineddata when missing', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outfitter-tess-'));
    tmpDirs.push(dir);
    const dest = path.join(dir, 'eng.traineddata');
    const found = await ensureEngTrainedData({
      destFile: dest,
      searchPaths: [dest],
      fetchImpl: async () => new Response(zlib.gzipSync(Buffer.from('trained-bytes')), { status: 200 }),
    });
    expect(found).toBe(dest);
    expect(fs.readFileSync(dest, 'utf8')).toBe('trained-bytes');
  });

  it('throws 503 when the download fails', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outfitter-tess-'));
    tmpDirs.push(dir);
    const dest = path.join(dir, 'eng.traineddata');
    await expect(
      ensureEngTrainedData({
        destFile: dest,
        searchPaths: [dest],
        fetchImpl: async () => new Response('nope', { status: 404 }),
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
});
