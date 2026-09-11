import Tesseract from 'tesseract.js';

import {
  parseArtifactOcr,
  type ArtifactCatalogRef,
  type ParsedArtifactOcr,
} from '../../shared/artifactOcr.js';
import {
  parseGearOcr,
  mergeGearOcr,
  type OcrHeroRef,
  type ParsedGearOcr,
} from '../../shared/gearOcr.js';
import { tessWorkerOptions } from './tessdata.js';

type OcrWorker = Awaited<ReturnType<typeof Tesseract.createWorker>>;

const CHAR_WHITELIST = "0123456789.%ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ':-+";
const DIACRITIC_NOISE = /detected \d+ diacritics/i;

let workerPromise: Promise<OcrWorker> | null = null;
let diacriticLogsHushed = false;

function hushTessDiacriticLogs(): void {
  if (diacriticLogsHushed) return;
  diacriticLogsHushed = true;
  const skip = (args: unknown[]) =>
    args.some((arg) => typeof arg === 'string' && DIACRITIC_NOISE.test(arg));
  const error = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (skip(args)) return;
    error(...args);
  };
  const warn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (skip(args)) return;
    warn(...args);
  };
  const stderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: unknown, encoding?: unknown, callback?: unknown) => {
    const text =
      typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : '';
    if (DIACRITIC_NOISE.test(text)) {
      if (typeof encoding === 'function') encoding();
      if (typeof callback === 'function') callback();
      return true;
    }
    return stderrWrite(chunk as never, encoding as never, callback as never);
  }) as typeof process.stderr.write;
}

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      hushTessDiacriticLogs();
      const worker = await Tesseract.createWorker('eng', 1, tessWorkerOptions());
      await worker.setParameters({
        tessedit_char_whitelist: CHAR_WHITELIST,
      });
      return worker;
    })();
  }
  try {
    return await workerPromise;
  } catch (error) {
    workerPromise = null;
    throw error;
  }
}

async function recognizePsm(
  worker: OcrWorker,
  image: Buffer,
  psm: Tesseract.PSM,
  heroes: readonly OcrHeroRef[],
): Promise<{ text: string } & ParsedGearOcr> {
  await worker.setParameters({
    tessedit_char_whitelist: CHAR_WHITELIST,
    tessedit_pageseg_mode: psm,
  });
  const text = (await worker.recognize(image)).data.text ?? '';
  return { text, ...parseGearOcr(text, heroes) };
}

export function decodeGearScreenshot(image: unknown): Buffer | string {
  if (typeof image !== 'string' || image.length === 0) return 'Paste a gear screenshot.';
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i.exec(image);
  if (!match?.[2]) return 'Paste a PNG or JPEG screenshot.';
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (buffer.length === 0) return 'Paste a PNG or JPEG screenshot.';
  if (buffer.length > 5 * 1024 * 1024) return 'Screenshot is too large (max 5 MB).';
  return buffer;
}

export async function closeOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}

function mergeArtifactOcr(base: ParsedArtifactOcr, extra: ParsedArtifactOcr): ParsedArtifactOcr {
  return {
    catalog_slug: base.catalog_slug ?? extra.catalog_slug,
    level: base.level ?? extra.level,
    promotion: base.promotion ?? extra.promotion,
    hp_base: base.hp_base ?? extra.hp_base,
    hp_bonus: base.hp_bonus ?? extra.hp_bonus,
    atk_base: base.atk_base ?? extra.atk_base,
    atk_bonus: base.atk_bonus ?? extra.atk_bonus,
    secondary_stat: base.secondary_stat ?? extra.secondary_stat,
    secondary_value: base.secondary_value ?? extra.secondary_value,
  };
}

export async function recognizeArtifactStats(
  image: Buffer,
  catalog: readonly ArtifactCatalogRef[] = [],
): Promise<{ text: string } & ParsedArtifactOcr> {
  const worker = await getWorker();
  async function pass(psm: Tesseract.PSM): Promise<{ text: string } & ParsedArtifactOcr> {
    await worker.setParameters({
      tessedit_char_whitelist: CHAR_WHITELIST + '/',
      tessedit_pageseg_mode: psm,
    });
    const text = (await worker.recognize(image)).data.text ?? '';
    return { text, ...parseArtifactOcr(text, catalog) };
  }
  const column = await pass(Tesseract.PSM.SINGLE_COLUMN);
  const block = await pass(Tesseract.PSM.SINGLE_BLOCK);
  const merged = { text: `${column.text}\n${block.text}`, ...mergeArtifactOcr(column, block) };
  if (merged.hp_base != null && merged.atk_base != null && merged.catalog_slug) return merged;
  const sparse = await pass(Tesseract.PSM.SPARSE_TEXT);
  return {
    text: `${merged.text}\n${sparse.text}`,
    ...mergeArtifactOcr(merged, sparse),
  };
}

export async function recognizeGearStats(
  image: Buffer,
  heroes: readonly OcrHeroRef[] = [],
): Promise<{ text: string } & ParsedGearOcr> {
  const worker = await getWorker();
  const column = await recognizePsm(worker, image, Tesseract.PSM.SINGLE_COLUMN, heroes);
  const block = await recognizePsm(worker, image, Tesseract.PSM.SINGLE_BLOCK, heroes);
  const merged = mergeGearOcr(column, block);
  if (merged.stats.length >= 5 && merged.set_key && merged.slot) return merged;
  const sparse = await recognizePsm(worker, image, Tesseract.PSM.SPARSE_TEXT, heroes);
  return mergeGearOcr(merged, sparse);
}
