import type Database from 'better-sqlite3';

import type {
  ArtifactSecondaryStat,
  FactionKey,
  GearPrefix,
  GearSlot,
  GearStatKey,
  HeroClassKey,
} from '../../shared/catalog.js';
import type { GearSubstat } from '../../shared/pieceStats.js';

export type AccountRow = {
  id: number;
  account_name: string;
  is_active: number;
  created_at: string;
};

export type CatalogHeroRow = {
  slug: string;
  name: string;
  class: HeroClassKey;
  faction: FactionKey;
  faction_secondary: FactionKey | null;
  rarity: string;
  star_rating: number;
  is_lord: number;
  portrait_path: string | null;
  base_hp: number;
  base_atk: number;
  base_def: number;
  base_atk_interval: number;
  base_rr_auto: number;
  base_rr_attack: number;
  base_rr_attacked: number;
  display_order: number;
};

export type HeroWithStats = CatalogHeroRow & {
  hp: number;
  atk: number;
  def: number;
  atk_interval: number;
  rr_auto: number;
  rr_attack: number;
  rr_attacked: number;
};

export type GearPieceRow = {
  id: number;
  account_id: number;
  slot: GearSlot;
  set_key: string;
  prefix: GearPrefix;
  main_stat: GearStatKey;
  main_value: number;
  main_bonus: number;
  sub1_stat: GearStatKey | null;
  sub1_value: number | null;
  sub2_stat: GearStatKey | null;
  sub2_value: number | null;
  sub3_stat: GearStatKey | null;
  sub3_value: number | null;
  sub4_stat: GearStatKey | null;
  sub4_value: number | null;
  exclusive_hero_slug: string | null;
  exclusive_faction: string | null;
  equipped_hero_slug: string | null;
  equipped_hero_name: string | null;
  equipped_hero_portrait: string | null;
  exclusive_hero_name: string | null;
  exclusive_hero_portrait: string | null;
};

export function listAccounts(db: Database.Database, clerkUserId: string): AccountRow[] {
  return db
    .prepare(
      `SELECT id, account_name, is_active, created_at
         FROM game_accounts WHERE clerk_user_id = ?
         ORDER BY is_active DESC, id ASC`,
    )
    .all(clerkUserId) as AccountRow[];
}

export function getAccount(
  db: Database.Database,
  accountId: number,
  clerkUserId: string,
): AccountRow | undefined {
  return db
    .prepare(
      `SELECT id, account_name, is_active, created_at
         FROM game_accounts WHERE id = ? AND clerk_user_id = ?`,
    )
    .get(accountId, clerkUserId) as AccountRow | undefined;
}

export function createAccount(
  db: Database.Database,
  clerkUserId: string,
  accountName: string,
): AccountRow {
  const existing = listAccounts(db, clerkUserId);
  const isActive = existing.length === 0 ? 1 : 0;
  const result = db
    .prepare(`INSERT INTO game_accounts (clerk_user_id, account_name, is_active) VALUES (?, ?, ?)`)
    .run(clerkUserId, accountName, isActive);
  const row = getAccount(db, Number(result.lastInsertRowid), clerkUserId);
  if (!row) throw new Error('Failed to create account');
  return row;
}

export function renameAccount(
  db: Database.Database,
  accountId: number,
  clerkUserId: string,
  accountName: string,
): void {
  const result = db
    .prepare(`UPDATE game_accounts SET account_name = ? WHERE id = ? AND clerk_user_id = ?`)
    .run(accountName, accountId, clerkUserId);
  if (result.changes === 0) throw new Error('Account not found');
}

export function deleteAccount(db: Database.Database, accountId: number, clerkUserId: string): void {
  const result = db
    .prepare(`DELETE FROM game_accounts WHERE id = ? AND clerk_user_id = ?`)
    .run(accountId, clerkUserId);
  if (result.changes === 0) throw new Error('Account not found');
}

export function setActiveAccount(
  db: Database.Database,
  accountId: number,
  clerkUserId: string,
): AccountRow {
  const owned = getAccount(db, accountId, clerkUserId);
  if (!owned) throw new Error('Account not found');
  const transaction = db.transaction(() => {
    db.prepare(`UPDATE game_accounts SET is_active = 0 WHERE clerk_user_id = ?`).run(clerkUserId);
    db.prepare(`UPDATE game_accounts SET is_active = 1 WHERE id = ? AND clerk_user_id = ?`).run(
      accountId,
      clerkUserId,
    );
  });
  transaction();
  const row = getAccount(db, accountId, clerkUserId);
  if (!row) throw new Error('Failed to switch account');
  return row;
}

export function listHeroNames(db: Database.Database): { slug: string; name: string }[] {
  return db.prepare(`SELECT slug, name FROM catalog_heroes WHERE active = 1`).all() as {
    slug: string;
    name: string;
  }[];
}

export function listHeroes(db: Database.Database, accountId: number): HeroWithStats[] {
  return db
    .prepare(
      `SELECT
         h.slug, h.name, h.class, h.faction, h.faction_secondary, h.rarity, h.star_rating,
         h.is_lord, h.portrait_path, h.base_hp, h.base_atk, h.base_def, h.base_atk_interval,
         h.base_rr_auto, h.base_rr_attack, h.base_rr_attacked, h.display_order,
         COALESCE(s.hp, h.base_hp) AS hp,
         COALESCE(s.atk, h.base_atk) AS atk,
         COALESCE(s.def, h.base_def) AS def,
         COALESCE(s.atk_interval, h.base_atk_interval) AS atk_interval,
         COALESCE(s.rr_auto, h.base_rr_auto) AS rr_auto,
         COALESCE(s.rr_attack, h.base_rr_attack) AS rr_attack,
         COALESCE(s.rr_attacked, h.base_rr_attacked) AS rr_attacked
       FROM catalog_heroes h
       LEFT JOIN account_hero_stats s
         ON s.hero_slug = h.slug AND s.account_id = ?
       WHERE h.active = 1
       ORDER BY h.display_order ASC, h.name ASC`,
    )
    .all(accountId) as HeroWithStats[];
}

export function getHero(
  db: Database.Database,
  accountId: number,
  slug: string,
): HeroWithStats | undefined {
  return db
    .prepare(
      `SELECT
         h.slug, h.name, h.class, h.faction, h.faction_secondary, h.rarity, h.star_rating,
         h.is_lord, h.portrait_path, h.base_hp, h.base_atk, h.base_def, h.base_atk_interval,
         h.base_rr_auto, h.base_rr_attack, h.base_rr_attacked, h.display_order,
         COALESCE(s.hp, h.base_hp) AS hp,
         COALESCE(s.atk, h.base_atk) AS atk,
         COALESCE(s.def, h.base_def) AS def,
         COALESCE(s.atk_interval, h.base_atk_interval) AS atk_interval,
         COALESCE(s.rr_auto, h.base_rr_auto) AS rr_auto,
         COALESCE(s.rr_attack, h.base_rr_attack) AS rr_attack,
         COALESCE(s.rr_attacked, h.base_rr_attacked) AS rr_attacked
       FROM catalog_heroes h
       LEFT JOIN account_hero_stats s
         ON s.hero_slug = h.slug AND s.account_id = ?
       WHERE h.slug = ? AND h.active = 1`,
    )
    .get(accountId, slug) as HeroWithStats | undefined;
}

export function upsertHeroStats(
  db: Database.Database,
  accountId: number,
  slug: string,
  stats: {
    hp: number;
    atk: number;
    def: number;
    atk_interval: number;
    rr_auto: number;
    rr_attack: number;
    rr_attacked: number;
  },
): void {
  db.prepare(
    `INSERT INTO account_hero_stats (
       account_id, hero_slug, hp, atk, def, atk_interval, rr_auto, rr_attack, rr_attacked
     ) VALUES (
       @account_id, @slug, @hp, @atk, @def, @atk_interval, @rr_auto, @rr_attack, @rr_attacked
     )
     ON CONFLICT(account_id, hero_slug) DO UPDATE SET
       hp = excluded.hp,
       atk = excluded.atk,
       def = excluded.def,
       atk_interval = excluded.atk_interval,
       rr_auto = excluded.rr_auto,
       rr_attack = excluded.rr_attack,
       rr_attacked = excluded.rr_attacked`,
  ).run({ account_id: accountId, slug, ...stats });
}

function gearSelectSql(): string {
  return `SELECT
      g.*,
      eh.name AS equipped_hero_name,
      eh.portrait_path AS equipped_hero_portrait,
      xh.name AS exclusive_hero_name,
      xh.portrait_path AS exclusive_hero_portrait
    FROM gear_pieces g
    LEFT JOIN catalog_heroes eh
      ON eh.slug = g.equipped_hero_slug
    LEFT JOIN catalog_heroes xh
      ON xh.slug = g.exclusive_hero_slug`;
}

export function listGear(db: Database.Database, accountId: number): GearPieceRow[] {
  return db
    .prepare(`${gearSelectSql()} WHERE g.account_id = ? ORDER BY g.slot ASC, g.id ASC`)
    .all(accountId) as GearPieceRow[];
}

export function getGear(
  db: Database.Database,
  accountId: number,
  gearId: number,
): GearPieceRow | undefined {
  return db
    .prepare(`${gearSelectSql()} WHERE g.account_id = ? AND g.id = ?`)
    .get(accountId, gearId) as GearPieceRow | undefined;
}

export type GearWrite = {
  slot: GearSlot;
  set_key: string;
  prefix: GearPrefix;
  main_stat: GearStatKey;
  main_value: number;
  main_bonus: number;
  substats: GearSubstat[];
  exclusive_hero_slug: string | null;
  exclusive_faction: string | null;
};

function subFields(substats: GearSubstat[]): Record<string, string | number | null> {
  return {
    sub1_stat: substats[0]?.stat ?? null,
    sub1_value: substats[0]?.value ?? null,
    sub2_stat: substats[1]?.stat ?? null,
    sub2_value: substats[1]?.value ?? null,
    sub3_stat: substats[2]?.stat ?? null,
    sub3_value: substats[2]?.value ?? null,
    sub4_stat: substats[3]?.stat ?? null,
    sub4_value: substats[3]?.value ?? null,
  };
}

export function insertGear(db: Database.Database, accountId: number, write: GearWrite): number {
  const result = db
    .prepare(
      `INSERT INTO gear_pieces (
         account_id, slot, set_key, prefix, main_stat, main_value, main_bonus,
         sub1_stat, sub1_value, sub2_stat, sub2_value, sub3_stat, sub3_value, sub4_stat, sub4_value,
         exclusive_hero_slug, exclusive_faction
       ) VALUES (
         @account_id, @slot, @set_key, @prefix, @main_stat, @main_value, @main_bonus,
         @sub1_stat, @sub1_value, @sub2_stat, @sub2_value, @sub3_stat, @sub3_value, @sub4_stat, @sub4_value,
         @exclusive_hero_slug, @exclusive_faction
       )`,
    )
    .run({
      account_id: accountId,
      slot: write.slot,
      set_key: write.set_key,
      prefix: write.prefix,
      main_stat: write.main_stat,
      main_value: write.main_value,
      main_bonus: write.main_bonus,
      exclusive_hero_slug: write.exclusive_hero_slug,
      exclusive_faction: write.exclusive_faction,
      ...subFields(write.substats),
    });
  return Number(result.lastInsertRowid);
}

export function updateGear(
  db: Database.Database,
  accountId: number,
  gearId: number,
  write: GearWrite,
): void {
  const result = db
    .prepare(
      `UPDATE gear_pieces SET
         slot = @slot, set_key = @set_key, prefix = @prefix,
         main_stat = @main_stat, main_value = @main_value, main_bonus = @main_bonus,
         sub1_stat = @sub1_stat, sub1_value = @sub1_value,
         sub2_stat = @sub2_stat, sub2_value = @sub2_value,
         sub3_stat = @sub3_stat, sub3_value = @sub3_value,
         sub4_stat = @sub4_stat, sub4_value = @sub4_value,
         exclusive_hero_slug = @exclusive_hero_slug,
         exclusive_faction = @exclusive_faction
       WHERE id = @id AND account_id = @account_id`,
    )
    .run({
      id: gearId,
      account_id: accountId,
      slot: write.slot,
      set_key: write.set_key,
      prefix: write.prefix,
      main_stat: write.main_stat,
      main_value: write.main_value,
      main_bonus: write.main_bonus,
      exclusive_hero_slug: write.exclusive_hero_slug,
      exclusive_faction: write.exclusive_faction,
      ...subFields(write.substats),
    });
  if (result.changes === 0) throw new Error('Gear not found');
}

export function deleteGear(db: Database.Database, accountId: number, gearId: number): void {
  const result = db
    .prepare(`DELETE FROM gear_pieces WHERE id = ? AND account_id = ?`)
    .run(gearId, accountId);
  if (result.changes === 0) throw new Error('Gear not found');
}

export function saveLoadout(
  db: Database.Database,
  accountId: number,
  heroSlug: string,
  pieceIds: number[],
): void {
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE gear_pieces SET equipped_hero_slug = NULL
        WHERE account_id = ? AND equipped_hero_slug = ?`,
    ).run(accountId, heroSlug);

    const update = db.prepare(
      `UPDATE gear_pieces SET equipped_hero_slug = ?
        WHERE id = ? AND account_id = ? AND (equipped_hero_slug IS NULL OR equipped_hero_slug = ?)`,
    );
    const seenSlots = new Set<string>();
    const slotOf = db.prepare(`SELECT slot FROM gear_pieces WHERE id = ? AND account_id = ?`);
    for (const id of new Set(pieceIds)) {
      const row: unknown = slotOf.get(id, accountId);
      const slot =
        row && typeof row === 'object' && 'slot' in row && typeof row.slot === 'string'
          ? row.slot
          : null;
      if (slot == null) {
        throw Object.assign(new Error('Gear piece not found'), { status: 400, expose: true });
      }
      if (seenSlots.has(slot)) {
        throw Object.assign(new Error('Only one piece per slot can be equipped on a hero'), {
          status: 400,
          expose: true,
        });
      }
      seenSlots.add(slot);
      let result;
      try {
        result = update.run(heroSlug, id, accountId, heroSlug);
      } catch (error) {
        if (
          typeof error === 'object' &&
          error != null &&
          'code' in error &&
          typeof error.code === 'string' &&
          error.code.startsWith('SQLITE_CONSTRAINT')
        ) {
          throw Object.assign(new Error('Only one piece per slot can be equipped on a hero'), {
            status: 400,
            expose: true,
          });
        }
        throw error;
      }
      if (result.changes === 0) {
        throw Object.assign(new Error('A selected piece is already equipped on another hero'), {
          status: 409,
          expose: true,
        });
      }
    }
  });
  transaction();
}

export function catalogHeroCount(db: Database.Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM catalog_heroes`).get() as { n: number };
  return row.n;
}

export function catalogArtifactCount(db: Database.Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM catalog_artifacts`).get() as { n: number };
  return row.n;
}

export function catalogStatus(db: Database.Database): {
  heroes: number;
  artifacts: number;
  missingStats: number;
} {
  const heroes = db
    .prepare(
      `SELECT COUNT(*) AS heroes,
              SUM(CASE WHEN base_hp = 0 AND base_atk = 0 THEN 1 ELSE 0 END) AS missingStats
         FROM catalog_heroes`,
    )
    .get() as { heroes: number; missingStats: number | null };
  return {
    heroes: heroes.heroes,
    artifacts: catalogArtifactCount(db),
    missingStats: heroes.missingStats ?? 0,
  };
}

export type CatalogArtifactRow = {
  slug: string;
  name: string;
  class: HeroClassKey | null;
  rarity: string;
  star_rating: number;
  exclusive_hero_slug: string | null;
  is_universal: number;
  portrait_path: string | null;
  display_order: number;
  exclusive_hero_name: string | null;
  exclusive_hero_portrait: string | null;
};

export type ArtifactPieceRow = {
  id: number;
  account_id: number;
  catalog_slug: string;
  name: string;
  class: HeroClassKey | null;
  rarity: string;
  star_rating: number;
  exclusive_hero_slug: string | null;
  is_universal: number;
  portrait_path: string | null;
  level: number;
  promotion: number;
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: ArtifactSecondaryStat | null;
  secondary_value: number | null;
  equipped_hero_slug: string | null;
  equipped_hero_name: string | null;
  equipped_hero_portrait: string | null;
  exclusive_hero_name: string | null;
  exclusive_hero_portrait: string | null;
};

function artifactSelectSql(): string {
  return `SELECT
      a.id, a.account_id, a.catalog_slug, a.level, a.promotion,
      a.hp_base, a.hp_bonus, a.atk_base, a.atk_bonus,
      a.secondary_stat, a.secondary_value, a.equipped_hero_slug,
      c.name, c.class, c.rarity, c.star_rating, c.exclusive_hero_slug,
      c.is_universal, c.portrait_path,
      eh.name AS equipped_hero_name,
      eh.portrait_path AS equipped_hero_portrait,
      xh.name AS exclusive_hero_name,
      xh.portrait_path AS exclusive_hero_portrait
    FROM artifact_pieces a
    INNER JOIN catalog_artifacts c ON c.slug = a.catalog_slug
    LEFT JOIN catalog_heroes eh ON eh.slug = a.equipped_hero_slug
    LEFT JOIN catalog_heroes xh ON xh.slug = c.exclusive_hero_slug`;
}

export function listCatalogArtifacts(db: Database.Database): CatalogArtifactRow[] {
  return db
    .prepare(
      `SELECT
         c.slug, c.name, c.class, c.rarity, c.star_rating, c.exclusive_hero_slug,
         c.is_universal, c.portrait_path, c.display_order,
         xh.name AS exclusive_hero_name,
         xh.portrait_path AS exclusive_hero_portrait
       FROM catalog_artifacts c
       LEFT JOIN catalog_heroes xh ON xh.slug = c.exclusive_hero_slug
       WHERE c.active = 1
       ORDER BY c.display_order ASC, c.name ASC`,
    )
    .all() as CatalogArtifactRow[];
}

export function listArtifactNames(db: Database.Database): { slug: string; name: string }[] {
  return db.prepare(`SELECT slug, name FROM catalog_artifacts WHERE active = 1`).all() as {
    slug: string;
    name: string;
  }[];
}

export function listArtifacts(db: Database.Database, accountId: number): ArtifactPieceRow[] {
  return db
    .prepare(`${artifactSelectSql()} WHERE a.account_id = ? ORDER BY c.name ASC, a.id ASC`)
    .all(accountId) as ArtifactPieceRow[];
}

export function getArtifact(
  db: Database.Database,
  accountId: number,
  artifactId: number,
): ArtifactPieceRow | undefined {
  return db
    .prepare(`${artifactSelectSql()} WHERE a.account_id = ? AND a.id = ?`)
    .get(accountId, artifactId) as ArtifactPieceRow | undefined;
}

export function getEquippedArtifact(
  db: Database.Database,
  accountId: number,
  heroSlug: string,
): ArtifactPieceRow | undefined {
  return db
    .prepare(`${artifactSelectSql()} WHERE a.account_id = ? AND a.equipped_hero_slug = ?`)
    .get(accountId, heroSlug) as ArtifactPieceRow | undefined;
}

export type ArtifactWrite = {
  catalog_slug: string;
  level: number;
  promotion: number;
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: ArtifactSecondaryStat | null;
  secondary_value: number | null;
};

export function insertArtifact(
  db: Database.Database,
  accountId: number,
  write: ArtifactWrite,
): number {
  const result = db
    .prepare(
      `INSERT INTO artifact_pieces (
         account_id, catalog_slug, level, promotion,
         hp_base, hp_bonus, atk_base, atk_bonus, secondary_stat, secondary_value
       ) VALUES (
         @account_id, @catalog_slug, @level, @promotion,
         @hp_base, @hp_bonus, @atk_base, @atk_bonus, @secondary_stat, @secondary_value
       )`,
    )
    .run({ account_id: accountId, ...write });
  return Number(result.lastInsertRowid);
}

export function updateArtifact(
  db: Database.Database,
  accountId: number,
  artifactId: number,
  write: ArtifactWrite,
): void {
  const result = db
    .prepare(
      `UPDATE artifact_pieces SET
         catalog_slug = @catalog_slug, level = @level, promotion = @promotion,
         hp_base = @hp_base, hp_bonus = @hp_bonus, atk_base = @atk_base, atk_bonus = @atk_bonus,
         secondary_stat = @secondary_stat, secondary_value = @secondary_value
       WHERE id = @id AND account_id = @account_id`,
    )
    .run({ id: artifactId, account_id: accountId, ...write });
  if (result.changes === 0) throw new Error('Artifact not found');
}

export function deleteArtifact(db: Database.Database, accountId: number, artifactId: number): void {
  const result = db
    .prepare(`DELETE FROM artifact_pieces WHERE id = ? AND account_id = ?`)
    .run(artifactId, accountId);
  if (result.changes === 0) throw new Error('Artifact not found');
}

export function equipArtifact(
  db: Database.Database,
  accountId: number,
  heroSlug: string,
  artifactId: number | null,
): void {
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE artifact_pieces SET equipped_hero_slug = NULL
        WHERE account_id = ? AND equipped_hero_slug = ?`,
    ).run(accountId, heroSlug);
    if (artifactId == null) return;
    db.prepare(
      `UPDATE artifact_pieces SET equipped_hero_slug = NULL
        WHERE account_id = ? AND id = ?`,
    ).run(accountId, artifactId);
    const result = db
      .prepare(
        `UPDATE artifact_pieces SET equipped_hero_slug = ?
          WHERE id = ? AND account_id = ?`,
      )
      .run(heroSlug, artifactId, accountId);
    if (result.changes === 0) {
      throw Object.assign(new Error('Artifact not found'), { status: 404, expose: true });
    }
  });
  transaction();
}
