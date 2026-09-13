import { Router } from 'express';

import {
  GEAR_PREFIXES,
  GEAR_SLOTS,
  GEAR_STAT_KEYS,
  SLOT_MAIN_STATS,
  type GearPrefix,
  type GearSlot,
  type GearStatKey,
} from '../../shared/catalog.js';
import { SET_BY_KEY } from '../../shared/sets.js';
import { requireAuthApi } from '../auth/middleware.js';
import { getAppDb } from '../db/appDb.js';
import * as q from '../db/queries.js';
import { asyncHandler, json, sendError } from '../http/handlers.js';
import { decodeGearScreenshot, recognizeGearStats } from '../ocr/recognizeGear.js';
import { requireAccountId } from '../session/account.js';

export const gearRouter = Router();
gearRouter.use(requireAuthApi);

gearRouter.post(
  '/ocr',
  asyncHandler(async (req, res) => {
    const image = req.body && typeof req.body === 'object' ? req.body.image : undefined;
    const decoded = decodeGearScreenshot(image);
    if (typeof decoded === 'string') {
      sendError(res, decoded);
      return;
    }
    try {
      const result = await recognizeGearStats(decoded, q.listHeroNames(getAppDb()));
      json(res, result);
    } catch (error) {
      const status = errorHttpStatus(error);
      const message =
        status === 503 && error instanceof Error
          ? error.message
          : 'Could not read that screenshot.';
      sendError(res, message, status);
    }
  }),
);

function errorHttpStatus(error: unknown): number {
  if (!error || typeof error !== 'object' || !('status' in error)) return 500;
  const status = error.status;
  return typeof status === 'number' && status >= 400 && status < 600 ? status : 500;
}

function isGearStat(value: unknown): value is GearStatKey {
  return typeof value === 'string' && (GEAR_STAT_KEYS as readonly string[]).includes(value);
}

function parseGearBody(
  body: unknown,
): { write: q.GearWrite; equipped_hero_slug: string | null } | string {
  if (!body || typeof body !== 'object') return 'Invalid body.';
  const record = body as Record<string, unknown>;
  const slot = record.slot;
  if (typeof slot !== 'string' || !(GEAR_SLOTS as readonly string[]).includes(slot)) {
    return 'Invalid slot.';
  }
  const setKey = String(record.set_key ?? '');
  const set = SET_BY_KEY[setKey];
  if (!set) return 'Unknown set.';
  const isLeft = slot === 'weapon' || slot === 'armor';
  if ((isLeft && set.side !== 'left') || (!isLeft && set.side !== 'right')) {
    return 'Set does not match that slot.';
  }
  const prefix = String(record.prefix ?? 'none');
  if (!(GEAR_PREFIXES as readonly string[]).includes(prefix)) return 'Invalid prefix.';
  const mainStat = record.main_stat;
  if (!isGearStat(mainStat) || !SLOT_MAIN_STATS[slot as GearSlot].includes(mainStat)) {
    return 'Invalid main stat for this slot.';
  }
  const mainValue = Number(record.main_value);
  const mainBonus = Number(record.main_bonus ?? 0);
  if (!Number.isFinite(mainValue) || mainValue <= 0)
    return 'Main stat value must be greater than 0.';
  if (!Number.isFinite(mainBonus) || mainBonus < 0) return 'Main bonus must be 0 or more.';
  const rawSubs = Array.isArray(record.substats) ? record.substats : [];
  if (rawSubs.length > 4) return 'At most 4 substats.';
  const substats: q.GearWrite['substats'] = [];
  for (const entry of rawSubs) {
    if (!entry || typeof entry !== 'object') return 'Invalid substat.';
    const sub = entry as Record<string, unknown>;
    if (!isGearStat(sub.stat)) return 'Invalid substat type.';
    const value = Number(sub.value);
    if (!Number.isFinite(value) || value < 0) return 'Invalid substat value.';
    substats.push({ stat: sub.stat, value });
  }
  const exclusiveHero =
    typeof record.exclusive_hero_slug === 'string' && record.exclusive_hero_slug.trim()
      ? record.exclusive_hero_slug.trim()
      : null;
  const exclusiveFaction =
    typeof record.exclusive_faction === 'string' && record.exclusive_faction.trim()
      ? record.exclusive_faction.trim()
      : null;
  if (exclusiveHero && exclusiveFaction) {
    return 'Hero exclusive and faction exclusive cannot both be set.';
  }
  if (exclusiveFaction && slot !== 'ring') {
    return 'Faction exclusive is only valid on rings.';
  }
  if (exclusiveHero && slot === 'ring') {
    return 'Hero exclusive is not valid on rings.';
  }
  const equippedHero =
    typeof record.equipped_hero_slug === 'string' && record.equipped_hero_slug.trim()
      ? record.equipped_hero_slug.trim()
      : null;
  return {
    write: {
      slot: slot as GearSlot,
      set_key: setKey,
      prefix: prefix as GearPrefix,
      main_stat: mainStat,
      main_value: mainValue,
      main_bonus: mainBonus,
      substats,
      exclusive_hero_slug: exclusiveHero,
      exclusive_faction: exclusiveFaction,
    },
    equipped_hero_slug: equippedHero,
  };
}

function requireEquippedHero(
  db: ReturnType<typeof getAppDb>,
  accountId: number,
  slug: string | null,
): string | null {
  if (slug == null) return null;
  if (!q.getHero(db, accountId, slug)) return 'Hero not found.';
  return null;
}

gearRouter.get(
  '/',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    json(res, { gear: q.listGear(getAppDb(), accountId) });
  }),
);

gearRouter.post(
  '/',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const parsed = parseGearBody(req.body);
    if (typeof parsed === 'string') {
      sendError(res, parsed);
      return;
    }
    const db = getAppDb();
    const equippedError = requireEquippedHero(db, accountId, parsed.equipped_hero_slug);
    if (equippedError) {
      sendError(res, equippedError, 404);
      return;
    }
    const id = db.transaction(() => {
      const gearId = q.insertGear(db, accountId, parsed.write);
      q.equipGearSlot(db, accountId, gearId, parsed.equipped_hero_slug);
      return gearId;
    })();
    json(res, { gear: q.getGear(db, accountId, id) }, 201);
  }),
);

gearRouter.patch(
  '/:id',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const gearId = Number(req.params.id);
    if (!Number.isInteger(gearId) || gearId <= 0) {
      sendError(res, 'Invalid gear id.');
      return;
    }
    const parsed = parseGearBody(req.body);
    if (typeof parsed === 'string') {
      sendError(res, parsed);
      return;
    }
    const db = getAppDb();
    if (!q.getGear(db, accountId, gearId)) {
      sendError(res, 'Gear piece not found.', 404);
      return;
    }
    const equippedError = requireEquippedHero(db, accountId, parsed.equipped_hero_slug);
    if (equippedError) {
      sendError(res, equippedError, 404);
      return;
    }
    q.updateGearWithEquip(db, accountId, gearId, parsed.write, parsed.equipped_hero_slug);
    json(res, { gear: q.getGear(db, accountId, gearId) });
  }),
);

gearRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const gearId = Number(req.params.id);
    if (!Number.isInteger(gearId) || gearId <= 0) {
      sendError(res, 'Invalid gear id.');
      return;
    }
    q.deleteGear(getAppDb(), accountId, gearId);
    json(res, { ok: true });
  }),
);
