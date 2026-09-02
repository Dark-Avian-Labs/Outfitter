import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { DATA_DIR, PROJECT_ROOT } from '../config.js';
import { log } from '../logger.js';

export const ENG_TRAINEDDATA_URL =
  'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';

const BUNDLED_FILE = path.join(PROJECT_ROOT, 'server', 'ocr', 'tessdata', 'eng.traineddata');
const CACHED_FILE = path.join(DATA_DIR, 'tessdata', 'eng.traineddata');

function isGzip(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

export function trainedDataSearchPaths(): string[] {
  return [BUNDLED_FILE, CACHED_FILE];
}

export async function ensureEngTrainedData(options?: {
  destFile?: string;
  searchPaths?: string[];
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const search = options?.searchPaths ?? trainedDataSearchPaths();
  for (const candidate of search) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const dest = options?.destFile ?? CACHED_FILE;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  log('info', 'Downloading OCR language data', { dest, url: ENG_TRAINEDDATA_URL });

  let response: Response;
  try {
    response = await (options?.fetchImpl ?? fetch)(ENG_TRAINEDDATA_URL);
  } catch (error) {
    throw Object.assign(
      new Error('Could not download OCR language data. Check outbound HTTPS from the server.'),
      { status: 503, cause: error },
    );
  }
  if (!response.ok) {
    throw Object.assign(new Error(`Could not download OCR language data (${response.status}).`), {
      status: 503,
    });
  }
  const packed = Buffer.from(await response.arrayBuffer());
  const data = isGzip(packed) ? zlib.gunzipSync(packed) : packed;
  if (data.length === 0) {
    throw Object.assign(new Error('Downloaded OCR language data was empty.'), { status: 503 });
  }
  fs.writeFileSync(dest, data);
  return dest;
}
