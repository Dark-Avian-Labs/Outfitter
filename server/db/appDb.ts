import Database from 'better-sqlite3';

import { APP_DB_PATH } from '../config.js';

export function createAppSchema(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      account_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(clerk_user_id, account_name)
    );

    CREATE TABLE IF NOT EXISTS catalog_heroes (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      faction TEXT NOT NULL,
      faction_secondary TEXT,
      rarity TEXT NOT NULL,
      star_rating INTEGER NOT NULL,
      is_lord INTEGER NOT NULL DEFAULT 0,
      portrait_path TEXT,
      base_hp REAL NOT NULL DEFAULT 0,
      base_atk REAL NOT NULL DEFAULT 0,
      base_def REAL NOT NULL DEFAULT 0,
      base_atk_interval REAL NOT NULL DEFAULT 1,
      base_rr_auto REAL NOT NULL DEFAULT 0,
      base_rr_attack REAL NOT NULL DEFAULT 0,
      base_rr_attacked REAL NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS account_hero_stats (
      account_id INTEGER NOT NULL,
      hero_slug TEXT NOT NULL,
      hp REAL,
      atk REAL,
      def REAL,
      atk_interval REAL,
      rr_auto REAL,
      rr_attack REAL,
      rr_attacked REAL,
      PRIMARY KEY (account_id, hero_slug),
      FOREIGN KEY (account_id) REFERENCES game_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (hero_slug) REFERENCES catalog_heroes(slug)
    );

    CREATE TABLE IF NOT EXISTS gear_pieces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      slot TEXT NOT NULL,
      set_key TEXT NOT NULL,
      prefix TEXT NOT NULL DEFAULT 'none',
      main_stat TEXT NOT NULL,
      main_value REAL NOT NULL,
      main_bonus REAL NOT NULL DEFAULT 0,
      sub1_stat TEXT,
      sub1_value REAL,
      sub2_stat TEXT,
      sub2_value REAL,
      sub3_stat TEXT,
      sub3_value REAL,
      sub4_stat TEXT,
      sub4_value REAL,
      exclusive_hero_slug TEXT,
      exclusive_faction TEXT,
      equipped_hero_slug TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES game_accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_game_accounts_clerk_user ON game_accounts(clerk_user_id);
    CREATE INDEX IF NOT EXISTS idx_gear_account ON gear_pieces(account_id);
    CREATE INDEX IF NOT EXISTS idx_gear_equipped ON gear_pieces(account_id, equipped_hero_slug);
  `);

  repairDuplicateActiveAccounts(db);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_game_accounts_single_active
      ON game_accounts(clerk_user_id) WHERE is_active = 1;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_gear_hero_slot
      ON gear_pieces(account_id, equipped_hero_slug, slot)
      WHERE equipped_hero_slug IS NOT NULL;
  `);
}

function repairDuplicateActiveAccounts(db: Database.Database): void {
  const duplicates = db
    .prepare(
      `SELECT clerk_user_id FROM game_accounts
        WHERE is_active = 1
        GROUP BY clerk_user_id HAVING COUNT(*) > 1`,
    )
    .all() as { clerk_user_id: string }[];
  if (duplicates.length === 0) return;
  const transaction = db.transaction(() => {
    for (const { clerk_user_id } of duplicates) {
      const keep = db
        .prepare(
          `SELECT id FROM game_accounts
            WHERE clerk_user_id = ? AND is_active = 1
            ORDER BY id ASC LIMIT 1`,
        )
        .get(clerk_user_id) as { id: number };
      db.prepare(
        `UPDATE game_accounts SET is_active = 0
          WHERE clerk_user_id = ? AND is_active = 1 AND id != ?`,
      ).run(clerk_user_id, keep.id);
    }
  });
  transaction();
}

let appDb: Database.Database | null = null;

export function getAppDb(): Database.Database {
  if (!appDb) {
    appDb = new Database(APP_DB_PATH);
    appDb.pragma('journal_mode = WAL');
    appDb.pragma('foreign_keys = ON');
    appDb.pragma('busy_timeout = 5000');
    createAppSchema(appDb);
  }
  return appDb;
}

export function closeAppDb(): void {
  if (appDb) {
    appDb.close();
    appDb = null;
  }
}
