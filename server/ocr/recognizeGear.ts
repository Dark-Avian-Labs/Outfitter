import Tesseract from 'tesseract.js';

import { parseGearOcr, type ParsedGearOcr } from '../../shared/gearOcr.js';
import { tessWorkerOptions } from './tessdata.js';

type OcrWorker = Awaited<ReturnType<typeof Tesseract.createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker('eng', 1, tessWorkerOptions());
      await worker.setParameters({
        tessedit_char_whitelist:
          "0123456789.%ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ':-+",
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
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
  const result = await worker.recognize(image);
  const text = result.data.text ?? '';
  return { text, ...parseGearOcr(text) };
}
