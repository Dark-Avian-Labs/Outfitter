import fs from 'node:fs';
import path from 'node:path';

import { DATA_DIR, PROJECT_ROOT } from '../config.js';

const BUNDLED_DIR = path.join(PROJECT_ROOT, 'server', 'ocr', 'tessdata');
const CACHE_DIR = path.join(DATA_DIR, 'tessdata');

export type TessLangConfig =
  | { langPath: string; gzip: false; cacheMethod: 'none' }
  | { cachePath: string; gzip: true; cacheMethod: 'write' };

export function tessWorkerOptionsFor(bundledDir: string, cacheDir: string): TessLangConfig {
  if (fs.existsSync(path.join(bundledDir, 'eng.traineddata'))) {
    return { langPath: bundledDir, gzip: false, cacheMethod: 'none' };
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  return { cachePath: cacheDir, gzip: true, cacheMethod: 'write' };
}

export function tessWorkerOptions(): TessLangConfig {
  return tessWorkerOptionsFor(BUNDLED_DIR, CACHE_DIR);
}
