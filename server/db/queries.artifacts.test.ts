import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { createAppSchema } from './appDb.js';
import * as q from './queries.js';

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  createAppSchema(db);
  db.prepare(`INSERT INTO game_accounts (clerk_user_id, account_name, is_active) VALUES ('u1', 'main', 1)`).run();
  db.prepare(
    `INSERT INTO catalog_heroes (
       slug, name, class, faction, rarity, star_rating
     ) VALUES ('ezio', 'Ezio', 'fighter', 'watchguard', 'legendary', 5)`,
  ).run();
  db.prepare(
    `INSERT INTO catalog_artifacts (
       slug, name, class, rarity, star_rating, exclusive_hero_slug, is_universal
     ) VALUES
       ('auditore-blade', 'Auditore Blade', null, 'mythic', 5, 'ezio', 0),
       ('golden-scarab', 'Golden Scarab', 'marksman', 'mythic', 5, null, 0)`,
  ).run();
  return db;
}

describe('artifact queries', () => {
  it('inserts, lists, and equips one artifact per hero', () => {
    const db = memoryDb();
    const id = q.insertArtifact(db, 1, {
      catalog_slug: 'golden-scarab',
      level: 25,
      promotion: 5,
      hp_base: 4650,
      hp_bonus: 2520,
      atk_base: 1497,
      atk_bonus: 335,
      secondary_stat: 'atkSpd',
      secondary_value: 49,
    });
    const listed = q.listArtifacts(db, 1);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe('Golden Scarab');
    expect(listed[0]?.class).toBe('marksman');

    q.equipArtifact(db, 1, 'ezio', id);
    expect(q.getEquippedArtifact(db, 1, 'ezio')?.id).toBe(id);

    const other = q.insertArtifact(db, 1, {
      catalog_slug: 'auditore-blade',
      level: 22,
      promotion: 5,
      hp_base: 4300,
      hp_bonus: 1840,
      atk_base: 1407,
      atk_bonus: 230,
      secondary_stat: null,
      secondary_value: null,
    });
    q.equipArtifact(db, 1, 'ezio', other);
    expect(q.getEquippedArtifact(db, 1, 'ezio')?.catalog_slug).toBe('auditore-blade');
    expect(q.getArtifact(db, 1, id)?.equipped_hero_slug).toBeNull();
  });

  it('reports catalog counts', () => {
    const db = memoryDb();
    const status = q.catalogStatus(db);
    expect(status.heroes).toBe(1);
    expect(status.artifacts).toBe(2);
  });
});
