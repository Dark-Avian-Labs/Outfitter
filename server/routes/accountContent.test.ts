import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppSchema } from '../db/appDb.js';

const authState = vi.hoisted(() => ({
  userId: null as string | null,
  isAdmin: false,
}));

const dbState = vi.hoisted(() => ({
  db: null as Database.Database | null,
}));

vi.mock('../auth/middleware.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../auth/middleware.js')>();
  return {
    ...actual,
    getClerkAuthState: () => ({
      authenticated: Boolean(authState.userId),
      userId: authState.userId,
      isAdmin: authState.isAdmin,
    }),
    requireAuthApi(_req: express.Request, res: express.Response, next: express.NextFunction): void {
      if (!authState.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
    },
  };
});

vi.mock('../db/appDb.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/appDb.js')>();
  return {
    ...actual,
    getAppDb: () => {
      if (!dbState.db) throw new Error('test database is not open');
      return dbState.db;
    },
  };
});

const { accountsRouter } = await import('./accounts.js');
const { artifactsRouter } = await import('./artifacts.js');
const { gearRouter } = await import('./gear.js');

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  createAppSchema(db);
  db.prepare(
    `INSERT INTO catalog_heroes (slug, name, class, faction, rarity, star_rating)
     VALUES ('ezio', 'Ezio', 'fighter', 'watchguard', 'legendary', 5)`,
  ).run();
  db.prepare(
    `INSERT INTO catalog_artifacts (
       slug, name, rarity, star_rating, exclusive_hero_slug, is_universal
     ) VALUES ('golden-scarab', 'Golden Scarab', 'mythic', 5, null, 0)`,
  ).run();
  return db;
}

function weapon(mainBonus = 1.2) {
  return {
    slot: 'weapon',
    set_key: 'calamity',
    prefix: 'none',
    main_stat: 'atk',
    main_value: 1056,
    main_bonus: mainBonus,
    substats: [],
    equipped_hero_slug: 'ezio',
  };
}

function artifactBody() {
  return {
    catalog_slug: 'golden-scarab',
    level: 25,
    promotion: 5,
    hp_base: 4650,
    hp_bonus: 2520,
    atk_base: 1497,
    atk_bonus: 335,
    secondary_stat: 'atkSpd',
    secondary_value: 49,
  };
}

function createApp(session: { account_id?: number }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use('/api/accounts', accountsRouter);
  app.use('/api/gear', gearRouter);
  app.use('/api/artifacts', artifactsRouter);
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const maybe = err as { status?: unknown; expose?: unknown; message?: unknown };
    const status = typeof maybe.status === 'number' ? maybe.status : 500;
    const message =
      maybe.expose === true && typeof maybe.message === 'string' && status < 500
        ? maybe.message
        : status === 500
          ? 'Internal server error'
          : 'Request failed';
    res.status(status).json({ error: message });
  });
  return app;
}

describe('signed-in account content', () => {
  let session: { account_id?: number };

  beforeEach(() => {
    authState.userId = null;
    authState.isAdmin = false;
    session = {};
    dbState.db?.close();
    dbState.db = memoryDb();
  });

  afterEach(() => {
    dbState.db?.close();
    dbState.db = null;
  });

  it('rejects account, gear, and artifact reads when signed out', async () => {
    const app = createApp(session);
    expect((await request(app).get('/api/accounts')).status).toBe(401);
    expect((await request(app).get('/api/gear')).status).toBe(401);
    expect((await request(app).get('/api/artifacts')).status).toBe(401);
  });

  it('creates an account for the signed-in user and hides it from someone else', async () => {
    const app = createApp(session);
    authState.userId = 'user_a';

    const created = await request(app).post('/api/accounts').send({ account_name: 'Main' });
    expect(created.status).toBe(201);
    expect(created.body.account.account_name).toBe('Main');
    expect(created.body.account.is_active).toBe(1);

    const mine = await request(app).get('/api/accounts');
    expect(mine.body.accounts).toHaveLength(1);
    expect(mine.body.current_account_id).toBe(created.body.account.id);

    authState.userId = 'user_b';
    const theirs = await request(app).get('/api/accounts');
    expect(theirs.body.accounts).toEqual([]);
    expect(theirs.body.current_account_id).toBeNull();

    const stolen = await request(app).post('/api/accounts/switch').send({ account_id: created.body.account.id });
    expect(stolen.status).toBe(500);

    authState.userId = 'user_a';
    const stillMine = await request(app).get('/api/accounts');
    expect(stillMine.body.accounts.map((row: { account_name: string }) => row.account_name)).toEqual(['Main']);
  });

  it('rejects an empty account name', async () => {
    authState.userId = 'user_a';
    const res = await request(createApp(session)).post('/api/accounts').send({ account_name: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Account name/);
  });

  it('keeps gear on the owning account and replaces the equipped weapon', async () => {
    const app = createApp(session);
    authState.userId = 'user_a';
    await request(app).post('/api/accounts').send({ account_name: 'Main' });

    const first = await request(app).post('/api/gear').send(weapon(1.2));
    expect(first.status).toBe(201);
    expect(first.body.gear.equipped_hero_slug).toBe('ezio');

    const second = await request(app).post('/api/gear').send(weapon(2.4));
    expect(second.status).toBe(201);
    expect(second.body.gear.equipped_hero_slug).toBe('ezio');

    const listed = await request(app).get('/api/gear');
    const pieces = listed.body.gear as { id: number; equipped_hero_slug: string | null }[];
    expect(pieces.find((piece) => piece.id === first.body.gear.id)?.equipped_hero_slug).toBeNull();
    expect(pieces.find((piece) => piece.id === second.body.gear.id)?.equipped_hero_slug).toBe('ezio');

    authState.userId = 'user_b';
    await request(app).post('/api/accounts').send({ account_name: 'Alt' });
    const hidden = await request(app).get('/api/gear');
    expect(hidden.body.gear).toEqual([]);

    const removed = await request(app).delete(`/api/gear/${second.body.gear.id}`);
    expect(removed.status).toBe(500);

    authState.userId = 'user_a';
    const stillThere = await request(app).get('/api/gear');
    expect(stillThere.body.gear).toHaveLength(2);
  });

  it('rejects gear writes until the user has an account', async () => {
    authState.userId = 'user_a';
    const res = await request(createApp(session)).post('/api/gear').send(weapon());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/game account/);
  });

  it('keeps artifacts on the owning account', async () => {
    const app = createApp(session);
    authState.userId = 'user_a';
    await request(app).post('/api/accounts').send({ account_name: 'Main' });

    const created = await request(app).post('/api/artifacts').send(artifactBody());
    expect(created.status).toBe(201);
    expect(created.body.artifact.catalog_slug).toBe('golden-scarab');

    const unknown = await request(app)
      .post('/api/artifacts')
      .send({ ...artifactBody(), catalog_slug: 'nope' });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error).toMatch(/Unknown artifact/);

    authState.userId = 'user_b';
    await request(app).post('/api/accounts').send({ account_name: 'Alt' });
    const hidden = await request(app).get('/api/artifacts');
    expect(hidden.body.artifacts).toEqual([]);

    const removed = await request(app).delete(`/api/artifacts/${created.body.artifact.id}`);
    expect(removed.status).toBe(500);

    authState.userId = 'user_a';
    const stillThere = await request(app).get('/api/artifacts');
    expect(stillThere.body.artifacts).toHaveLength(1);
  });
});
