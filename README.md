# Outfitter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PR](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/pr.yml/badge.svg)](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/pr.yml)
[![CI](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/ci.yml/badge.svg)](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node-%3E%3D26-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)
[![Cursor](https://img.shields.io/badge/Cursor-IDE-141414?logo=cursor&logoColor=white)](https://cursor.com)

Watcher of Realms equipment manager and optimizer. Store mythic gear, save one loadout per hero, and search the stash for pieces that hit your stat floors.

## Features

- Per-account gear inventory with set, main, and four substats (Ctrl+V a gear screenshot to fill stats)
- Hero loadouts with base + gear stat breakdown
- Weighted optimizer (ATK / crit / speed with diminishing returns) returning up to three ranked sets
- Admin catalog sync from Codex (person menu) for the live server

## Requirements

- Node.js 26+
- pnpm 11+
- A populated Codex WoR database for hero names, portraits, and wiki stats

## Quick start

1. `pnpm install`
2. Copy Clerk keys from Codex or Armory into `.env.development` (leave them empty only if you are not signing in)
3. `pnpm dev`

Open `http://127.0.0.1:5174`. The API listens on port **3004**. The first boot copies the Codex catalog when `CODEX_WOR_DB_PATH` exists.

## Examples

```bash
curl -sS http://127.0.0.1:3004/api/health
```

## Ports

| App           | Port |
| ------------- | ---- |
| AppBase       | 3000 |
| BudgetPlanner | 3001 |
| Codex         | 3001 |
| Armory        | 3002 |
| Outfitter     | 3004 |

Vite for Outfitter defaults to **5174**.

## Environment

Secrets in the committed env files are encrypted with dotenvx. `VITE_*` values stay plaintext so `vite build` can read them.

| Variable                     | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `PORT`, `HOST`               | Server bind address (default `3004` / `127.0.0.1`).         |
| `APP_NAME`, `APP_ID`         | Display name and Clerk role lookup (`outfitter`).           |
| `APP_PUBLIC_BASE_URL`        | Public origin; required when Clerk is enabled.              |
| `ALLOWED_APP_ORIGINS`        | Extra Clerk authorized-party origins (sibling DAL apps).    |
| `SESSION_SECRET`             | Required and 32+ chars in production.                       |
| `SESSION_DB_PATH`            | Express session SQLite file.                                |
| `APP_DB_PATH`                | Accounts, catalog, and gear SQLite file.                    |
| `HERO_IMAGES_DIR`            | Copied Codex portraits and icons, served at `/hero-images`. |
| `CODEX_WOR_DB_PATH`          | Read-only Codex Watcher of Realms catalog.                  |
| `CODEX_WOR_IMAGES_DIR`       | Codex image directory used during catalog import.           |
| `CLERK_SECRET_KEY`           | Clerk server key.                                           |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (plaintext).                          |
| `VITE_DEV_API_TARGET`        | Vite `/api` proxy target.                                   |
| `VITE_DEV_PORT`              | Vite port (default `5174`).                                 |

## Scripts

| Script                    | Description                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm run validate`       | Preflight + format, lint, typecheck, and tests.                                                                  |
| `pnpm dev`                | Vite + watched API server.                                                                                       |
| `pnpm run catalog:import` | Copy Codex WoR heroes and images into the Outfitter database. Admins can do the same from the in-app Admin page. |
| `pnpm run build`          | Typecheck, compile the server, and build the client.                                                             |
| `pnpm start`              | Run the compiled server (`NODE_ENV=production`).                                                                 |

## Development

Design system: AppBase `AGENTS.md`.
Org engineering standards: AppBase `docs/org-standards/`.

Gear piece art and set badges live in `public/gear/` (from [prospector.gg/gearsets](https://prospector.gg/gearsets/)). Empty slot icons are `public/gear/slots/`.

## License

MIT
