<p align="center">
  <img src="https://raw.githubusercontent.com/Dark-Avian-Labs/.github/refs/heads/main/banner.png" alt="Dark Avian Labs">
</p>

# Outfitter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Dark-Avian-Labs/Outfitter/ci.yml?style=flat-square&label=CI)](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/ci.yml)
[![PR](https://img.shields.io/github/actions/workflow/status/Dark-Avian-Labs/Outfitter/pr.yml?style=flat-square&label=PR)](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/pr.yml)
![Node](https://img.shields.io/badge/Node-%3E%3D26-339933?logo=node.js&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
[![Cursor](https://img.shields.io/badge/Cursor-IDE-141414?logo=cursor&logoColor=white&style=flat-square)](https://cursor.com)

Watcher of Realms gear inventory and loadout optimizer. Store mythic pieces, save one loadout per hero, search the stash for sets that hit stat floors. Hero catalog and combat stats come from Codex. Sign-in uses [Clerk](https://clerk.com).

Live: [outfitter.darkavianlabs.com](https://outfitter.darkavianlabs.com)

Default API port is **3004**. Vite is **5174**.

## Gotchas

- Needs a populated Codex Watcher of Realms database. Point `CODEX_WOR_DB_PATH` (read-only) at it. First boot copies the catalog when that path exists; otherwise run `pnpm run catalog:import` or Admin import. Missing wiki stats show as 0 until edited on the Outfit tab.
- `APP_DB_PATH` and `SESSION_DB_PATH` must be different files. Do not reuse Codex / Armory / BudgetPlanner SQLite.
- Inventory requires Clerk. Same instance as Codex and Armory (`apps.outfitter === 'admin'` for catalog import). Empty keys skip auth; placeholder keys are fatal. Keep `VITE_*` plaintext.
- Ctrl+V on add-gear OCRs a screenshot. If `server/ocr/tessdata/eng.traineddata` is missing, Tesseract fetches English data on first use into `data/tessdata`. Slot, set, prefix, and exclusives stay manual.
- After changing Node versions on Windows, `pnpm rebuild better-sqlite3`.

## License

MIT
