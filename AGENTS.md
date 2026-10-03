# Outfitter

Shell, auth, env, and validate are in AppBase `AGENTS.md`. Port 3004. Vite 5174. Playwright 3104. Signed-in Playwright 4104.

Watcher of Realms gear optimizer. Hero identity and Lv.60 A0 stats are copied from Codex `CODEX_WOR_DB_PATH`, the read-only `wor-catalog.db`, when the local catalog is empty, from Admin, or from `pnpm run catalog:import`.

`APP_DB_PATH` and `SESSION_DB_PATH` must be different files. Portraits copy into `HERO_IMAGES_DIR`.

Account-specific stat edits live in `account_hero_stats`. One piece and one artifact equip on one hero. Saving an Outfit result unequips that hero's previous pieces and leaves the artifact. Include-equipped uses this hero's gear only.

Stat math is `shared/formulas.ts`. Pieces are mythic, with four substats.

OCR is `server/ocr/`. A missing `eng.traineddata` is fetched once into `data/tessdata`.
