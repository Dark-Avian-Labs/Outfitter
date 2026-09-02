import fs from 'node:fs';
import path from 'node:path';

import { HERO_IMAGES_DIR } from '../config.js';

const TACTICIAN_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M6 4h5v3.2h3.2V4h3.6v3.2H21V4h5v6.2h-2.4v8.6h2.2v3.4H6.2v-3.4h2.2V10.2H6V4zm3.4 20.4h13.2v2.2H9.4v-2.2zm-2.2 3.2h17.6V30H7.2v-2.4z"/>
</svg>
`;

export function writeTacticianClassIconSvg(imagesRoot = HERO_IMAGES_DIR): string {
  const dest = path.join(imagesRoot, 'icons', 'classes', 'tactician.svg');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, TACTICIAN_SVG);
  return dest;
}
