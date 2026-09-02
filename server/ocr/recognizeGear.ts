import Tesseract from 'tesseract.js';

import { parseGearOcr, mergeGearOcr, type ParsedGearOcr } from '../../shared/gearOcr.js';
import { tessWorkerOptions } from './tessdata.js';

type OcrWorker = Awaited<ReturnType<typeof Tesseract.createWorker>>;

const CHAR_WHITELIST = "0123456789.%ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ':-+";

let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
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
): Promise<{ text: string } & ParsedGearOcr> {
  await worker.setParameters({
    tessedit_char_whitelist: CHAR_WHITELIST,
    tessedit_pageseg_mode: psm,
  });
  const text = (await worker.recognize(image)).data.text ?? '';
  return { text, ...parseGearOcr(text) };
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

export async function recognizeGearStats(image: Buffer): Promise<{ text: string } & ParsedGearOcr> {
  const worker = await getWorker();
  const column = await recognizePsm(worker, image, Tesseract.PSM.SINGLE_COLUMN);
  const block = await recognizePsm(worker, image, Tesseract.PSM.SINGLE_BLOCK);
  const merged = mergeGearOcr(column, block);
  if (merged.stats.length >= 5 && merged.set_key && merged.slot) return merged;
  const sparse = await recognizePsm(worker, image, Tesseract.PSM.SPARSE_TEXT);
  return mergeGearOcr(merged, sparse);
}
