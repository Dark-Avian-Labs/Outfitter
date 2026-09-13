import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { createAppSchema } from './appDb.js';
import * as q from './queries.js';

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  createAppSchema(db);
  db.prepare(`INSERT INTO game_accounts (clerk_user_id, account_name, is_active) VALUES ('u1', 'main', 1)`).run();
  db.prepare(
    `INSERT INTO catalog_heroes (slug, name, class, faction, rarity, star_rating) VALUES
       ('ezio', 'Ezio', 'fighter', 'watchguard', 'legendary', 5),
       ('aira', 'Aira', 'mage', 'sylvan', 'legendary', 5)`,
  ).run();
  return db;
}

function weapon(mainBonus = 1.2): q.GearWrite {
  return {
    slot: 'weapon',
    set_key: 'calamity',
    prefix: 'none',
    main_stat: 'atk',
    main_value: 1056,
    main_bonus: mainBonus,
    substats: [],
    exclusive_hero_slug: null,
    exclusive_faction: null,
  };
}

describe('gear queries', () => {
  it('equips a piece and overwrites the same slot on that hero', () => {
    const db = memoryDb();
    const first = q.insertGear(db, 1, weapon(1.2));
    const second = q.insertGear(db, 1, weapon(2.4));

    q.equipGearSlot(db, 1, first, 'ezio');
    expect(q.getGear(db, 1, first)?.equipped_hero_slug).toBe('ezio');

    q.equipGearSlot(db, 1, second, 'ezio');
    expect(q.getGear(db, 1, second)?.equipped_hero_slug).toBe('ezio');
    expect(q.getGear(db, 1, first)?.equipped_hero_slug).toBeNull();
  });

  it('moves a piece to another hero and unequips with null', () => {
    const db = memoryDb();
    const id = q.insertGear(db, 1, weapon());
    q.equipGearSlot(db, 1, id, 'ezio');
    q.equipGearSlot(db, 1, id, 'aira');
    expect(q.getGear(db, 1, id)?.equipped_hero_slug).toBe('aira');

    q.equipGearSlot(db, 1, id, null);
    expect(q.getGear(db, 1, id)?.equipped_hero_slug).toBeNull();
  });

  it('can change slot on an equipped piece without colliding', () => {
    const db = memoryDb();
    const weaponId = q.insertGear(db, 1, weapon());
    const armorId = q.insertGear(db, 1, {
      ...weapon(),
      slot: 'armor',
      set_key: 'calamity',
      main_stat: 'hp',
      main_value: 3960,
      main_bonus: 0,
    });
    q.equipGearSlot(db, 1, weaponId, 'ezio');
    q.equipGearSlot(db, 1, armorId, 'ezio');

    q.updateGearWithEquip(
      db,
      1,
      weaponId,
      { ...weapon(), slot: 'armor', set_key: 'calamity', main_stat: 'hp', main_value: 3000 },
      'ezio',
    );
    expect(q.getGear(db, 1, weaponId)?.slot).toBe('armor');
    expect(q.getGear(db, 1, weaponId)?.equipped_hero_slug).toBe('ezio');
    expect(q.getGear(db, 1, armorId)?.equipped_hero_slug).toBeNull();
  });
});
