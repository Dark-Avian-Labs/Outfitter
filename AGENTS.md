# Outfitter

## Org standards

Shared Dark Avian Labs engineering conventions (README shape, CI/PR runners, validate, release tracks) live in AppBase [`docs/org-standards/`](../AppBase/docs/org-standards/). The design system (theme axes, glass contracts, UI primitives, Clerk appearance) lives in AppBase [`AGENTS.md`](../AppBase/AGENTS.md). There is no shared UI package: when you change layout, glass, buttons, or modals here, apply the same change in AppBase / Codex / Armory.

## Overview

Outfitter is a Watcher of Realms gear inventory and loadout optimizer. Players store mythic pieces, build one loadout per hero, and search the stash for sets that hit stat floors.

Default listen port is **3004**. Vite defaults to **5174**. See `README.md` for scripts and env.

## Databases

Two SQLite files. Do not point them at the same path, and do not reuse Codex, Armory, or BudgetPlanner files.

| File    | Env               | Role                                     |
| ------- | ----------------- | ---------------------------------------- |
| App     | `APP_DB_PATH`     | Accounts, catalog copy, gear, loadouts.  |
| Session | `SESSION_DB_PATH` | Express sessions / CSRF, active account. |

Hero portraits and class/faction icons live in `HERO_IMAGES_DIR` (served at `/hero-images`). They are copied from Codex on catalog import.

## Codex catalog

Hero identity and Lv.60 A0 combat stats come from Codex's Watcher of Realms DB (`CODEX_WOR_DB_PATH`, read-only). Codex scrapes wiki infobox fields (`hp`, `atk`, `def`, `atkinterval`, `rr_auto`, `rr_attack`, `rr_attacked`) in the `fandomHeroStats` pipeline step. Outfitter copies those rows on boot if its catalog is empty, from the Admin page (user menu, `apps.outfitter === 'admin'`), or via `POST /api/admin/import-catalog` / `pnpm run catalog:import`.

If wiki stats are missing, hero bases are 0 until the user edits them on the Outfit tab. Edits persist per game account in `account_hero_stats`.

## Auth

Clerk login is required for inventory. Same instance as Codex/Armory (`apps.outfitter === 'admin'` for catalog import). Multiple WoR game accounts per Clerk user, same pattern as Codex. Loadouts are private.

Production `COOKIE_DOMAIN=.darkavianlabs.com` shares one login. `APP_PUBLIC_BASE_URL` is required when Clerk is configured; `ALLOWED_APP_ORIGINS` lists sibling apps for Clerk `authorizedParties` and CSRF origin checks. Keep `VITE_*` plaintext. Session token must include `"metadata": "{{user.public_metadata}}"`.

## Gear and optimizer

Mythic only, four substats. Main stat is a free number plus a 0–max gem bonus (see `MAIN_STAT_BONUS_MAX`). Substat gauges color by percent of max: grey / green / blue / purple / gold / red.

ATK = `(base + every flat ATK) * (1 + every ATK%)`. Percents add. Glacier adds `0.06 * final HP` to ATK **after** that multiply, so ATK% does not apply to the Glacier chunk.

ATK Speed: inherent 100, gear adds on top. Interval `I = I0 * (0.28 + 0.72 * 200 / (200 + B))` where `B = totalAtkSpd - 100`. Display rounds to one decimal. Optimizer scores the attacks-per-second gain, not raw speed.

Healing Effect uses `1 + 1.5 * HE / (100 + HE)` for scoring. `% Rage Regen` does not increase Rage Regen (Auto).

Add-gear accepts Ctrl+V of a Watcher of Realms gear screenshot. OCR only fills stat types and values (`server/ocr/`). If `server/ocr/tessdata/eng.traineddata` is missing, Tesseract.js fetches English data on first use and caches it under `data/tessdata`. Slot, set, prefix, and exclusives stay manual.

In-game piece art and set badges live in `public/gear/` (from [prospector.gg/gearsets](https://prospector.gg/gearsets/)). Piece art already includes the set badge, so tiles do not overlay it. Standalone badges in `public/gear/sets/` are kept for later filter UI. Empty slot silhouettes are `public/gear/slots/{slot}.webp` (type filters, unequipped loadout slots, missing piece fallback).

One piece can be equipped on one hero. One loadout per hero. Saving an Outfit result unequips that hero's previous pieces. "Include equipped" uses this hero's gear and never other heroes'. Force sets restricts the search to the chosen left/right sets.

## Toolchain

Node **26+**, pnpm **11.x**, exact `packageManager`. Encrypted env files need `DOTENV_PRIVATE_KEY_*` or `.env.keys`. `pnpm run validate` is the quality gate.

On Windows, Cursor agent shells may prepend bundled Node 22. After changing Node versions, run `pnpm rebuild better-sqlite3`.
