<p align="center">
  <img src="https://raw.githubusercontent.com/Dark-Avian-Labs/.github/refs/heads/main/banner.png" alt="Dark Avian Labs">
</p>

# Outfitter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
![Node](https://img.shields.io/badge/Node-%3E%3D26-339933?logo=node.js&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
[![Cursor](https://img.shields.io/badge/Cursor-IDE-141414?logo=cursor&logoColor=white&style=flat-square)](https://cursor.com)

Outfitter is a Watcher of Realms stash you can search. Drop mythic gear and artifacts in, set the stat floors you care about, and let it look for a loadout that hits them.

It is for players who are tired of opening the inventory, squinting at substats, and swapping pieces one slot at a time.

## Features

**A stash with the rolls visible.** Gear and artifacts keep their sets, prefixes, and substats. Gauges make a good roll obvious before you open the piece.

**One outfit per hero.** The search saves a single loadout on that hero. The next swap is the saved outfit, not another rummage. A piece already equipped on someone else stays put.

**Floors and sets.** You set minimum stats and can force a set. If nothing fits, the page says so and tells you to relax a floor or add more gear, instead of handing back a quiet empty result.

**Paste a screenshot.** Ctrl+V on the add dialog reads the gear or artifact shot and fills type, set, prefix, and stats. You still check the numbers. You do not retype them.

**Heroes from Codex.** Names, portraits, and the level 60 combat bases come from Codex's Watcher of Realms catalog. Outfitter does not keep a second hero list.

## What you should know

The stash sits behind a Dark Avian Labs account. The same sign-in opens Codex, Armory, BudgetPlanner, and Sentinel. The left rail jumps between those sites.

The stash stays on your sign-in.

A fresh copy has no heroes until it can read a Codex catalog file. Point `CODEX_WOR_DB_PATH` at `wor-catalog.db` from a Codex that has already imported Watcher of Realms.

Live: [outfitter.darkavianlabs.com](https://outfitter.darkavianlabs.com)

## Self-hosting

Node 26 or newer, and pnpm 12. Copy `.env.example` to `.env.development`. `pnpm dev` reads that file. Clerk keys can stay empty there. Production refuses to start without them.

```
pnpm install
pnpm dev
```

A hosted process needs `NODE_ENV=production` and `.env.production`. Fill the Clerk keys before `pnpm run build`. The client bundle reads `VITE_` values at build time. Without the Codex catalog file, the hero list stays empty no matter how the app is built.

## License

MIT
