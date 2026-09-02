import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { CODEX_WOR_DB_PATH, CODEX_WOR_IMAGES_DIR, HERO_IMAGES_DIR } from '../config.js';
import { getAppDb } from '../db/appDb.js';

type CodexHeroRow = {
  slug: string;
  name: string;
  class: string;
  faction: string;
  faction_secondary: string | null;
  rarity: string;
  star_rating: number;
  is_lord: number;
  portrait_path: string | null;
  base_hp: number | null;
  base_atk: number | null;
  base_def: number | null;
  base_atk_interval: number | null;
  base_rr_auto: number | null;
  base_rr_attack: number | null;
  base_rr_attacked: number | null;
  display_order: number;
  active: number;
};

export type CatalogImportSummary = {
  heroes: number;
  portraitsCopied: number;
  iconsCopied: number;
  missingStats: number;
};

function relativeFromWorPath(portraitPath: string | null): string | null {
  if (!portraitPath) return null;
  return portraitPath.replace(/^\/wor-images\//, '').replace(/^wor-images\//, '');
}

function copyIfExists(fromPath: string, toPath: string): boolean {
  if (!fs.existsSync(fromPath)) return false;
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  fs.copyFileSync(fromPath, toPath);
  return true;
}

function copyIconTree(kind: 'classes' | 'factions'): number {
  const fromDir = path.join(CODEX_WOR_IMAGES_DIR, 'icons', kind);
  const toDir = path.join(HERO_IMAGES_DIR, 'icons', kind);
  if (!fs.existsSync(fromDir)) return 0;
  fs.mkdirSync(toDir, { recursive: true });
  let copied = 0;
  for (const file of fs.readdirSync(fromDir)) {
    const from = path.join(fromDir, file);
    if (!fs.statSync(from).isFile()) continue;
    fs.copyFileSync(from, path.join(toDir, file));
    copied += 1;
  }
  return copied;
}

export function importCodexCatalog(): CatalogImportSummary {
  if (!fs.existsSync(CODEX_WOR_DB_PATH)) {
    throw Object.assign(new Error(`Codex WoR database not found at ${CODEX_WOR_DB_PATH}`), {
      status: 503,
    });
  }

  const source = new Database(CODEX_WOR_DB_PATH, { readonly: true, fileMustExist: true });
  source.pragma('busy_timeout = 5000');
  let heroes: CodexHeroRow[] = [];
  try {
    const available = new Set(
      (source.prepare('PRAGMA table_info(catalog_heroes)').all() as { name: string }[]).map(
        (column) => column.name,
      ),
    );
    const wanted = [
      'slug',
      'name',
      'class',
      'faction',
      'faction_secondary',
      'rarity',
      'star_rating',
      'is_lord',
      'portrait_path',
      'base_hp',
      'base_atk',
      'base_def',
      'base_atk_interval',
      'base_rr_auto',
      'base_rr_attack',
      'base_rr_attacked',
      'display_order',
      'active',
    ] as const;
    const selectList = wanted.filter((column) => available.has(column));
    if (!selectList.includes('slug') || !selectList.includes('name')) {
      throw new Error('Codex catalog_heroes is missing slug/name');
    }
    const rows = source
      .prepare(`SELECT ${selectList.join(', ')} FROM catalog_heroes`)
      .all() as Record<string, unknown>[];
    heroes = rows.map((row) => ({
      slug: String(row.slug),
      name: String(row.name),
      class: String(row.class ?? ''),
      faction: String(row.faction ?? ''),
      faction_secondary: (row.faction_secondary as string | null | undefined) ?? null,
      rarity: String(row.rarity ?? ''),
      star_rating: Number(row.star_rating ?? 0),
      is_lord: Number(row.is_lord ?? 0),
      portrait_path: (row.portrait_path as string | null | undefined) ?? null,
      base_hp: (row.base_hp as number | null | undefined) ?? null,
      base_atk: (row.base_atk as number | null | undefined) ?? null,
      base_def: (row.base_def as number | null | undefined) ?? null,
      base_atk_interval: (row.base_atk_interval as number | null | undefined) ?? null,
      base_rr_auto: (row.base_rr_auto as number | null | undefined) ?? null,
      base_rr_attack: (row.base_rr_attack as number | null | undefined) ?? null,
      base_rr_attacked: (row.base_rr_attacked as number | null | undefined) ?? null,
      display_order: Number(row.display_order ?? 0),
      active: Number(row.active ?? 1),
    }));
  } finally {
    source.close();
  }

  const db = getAppDb();
  const upsert = db.prepare(`
    INSERT INTO catalog_heroes (
      slug, name, class, faction, faction_secondary, rarity, star_rating, is_lord,
      portrait_path, base_hp, base_atk, base_def, base_atk_interval,
      base_rr_auto, base_rr_attack, base_rr_attacked, display_order, active
    ) VALUES (
      @slug, @name, @class, @faction, @faction_secondary, @rarity, @star_rating, @is_lord,
      @portrait_path, @base_hp, @base_atk, @base_def, @base_atk_interval,
      @base_rr_auto, @base_rr_attack, @base_rr_attacked, @display_order, @active
    )
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      class = excluded.class,
      faction = excluded.faction,
      faction_secondary = excluded.faction_secondary,
      rarity = excluded.rarity,
      star_rating = excluded.star_rating,
      is_lord = excluded.is_lord,
      portrait_path = COALESCE(excluded.portrait_path, catalog_heroes.portrait_path),
      base_hp = excluded.base_hp,
      base_atk = excluded.base_atk,
      base_def = excluded.base_def,
      base_atk_interval = excluded.base_atk_interval,
      base_rr_auto = excluded.base_rr_auto,
      base_rr_attack = excluded.base_rr_attack,
      base_rr_attacked = excluded.base_rr_attacked,
      display_order = excluded.display_order,
      active = excluded.active
  `);

  let portraitsCopied = 0;
  let missingStats = 0;
  const transaction = db.transaction(() => {
    for (const hero of heroes) {
      const relative = relativeFromWorPath(hero.portrait_path);
      if (relative) {
        const copied = copyIfExists(
          path.join(CODEX_WOR_IMAGES_DIR, relative),
          path.join(HERO_IMAGES_DIR, relative),
        );
        if (copied) portraitsCopied += 1;
      }
      if (hero.base_hp == null || hero.base_atk == null) missingStats += 1;
      upsert.run({
        slug: hero.slug,
        name: hero.name,
        class: hero.class,
        faction: hero.faction,
        faction_secondary: hero.faction_secondary,
        rarity: hero.rarity,
        star_rating: hero.star_rating,
        is_lord: hero.is_lord,
        portrait_path: relative ? `/hero-images/${relative.replace(/\\/g, '/')}` : null,
        base_hp: hero.base_hp ?? 0,
        base_atk: hero.base_atk ?? 0,
        base_def: hero.base_def ?? 0,
        base_atk_interval: hero.base_atk_interval ?? 1,
        base_rr_auto: hero.base_rr_auto ?? 0,
        base_rr_attack: hero.base_rr_attack ?? 0,
        base_rr_attacked: hero.base_rr_attacked ?? 0,
        display_order: hero.display_order,
        active: hero.active ?? 1,
      });
    }
  });
  transaction();

  const iconsCopied = copyIconTree('classes') + copyIconTree('factions');
  return { heroes: heroes.length, portraitsCopied, iconsCopied, missingStats };
}
