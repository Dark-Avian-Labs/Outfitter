import { Router } from 'express';

import { SCORE_STAT_KEYS, optimizeLoadouts, type ScoreStatKey } from '../../shared/optimizer.js';
import type { GearPieceInput } from '../../shared/pieceStats.js';
import { requireAuthApi } from '../auth/middleware.js';
import { getAppDb } from '../db/appDb.js';
import * as q from '../db/queries.js';
import { asyncHandler, json, sendError } from '../http/handlers.js';
import { requireAccountId } from '../session/account.js';

export const outfitRouter = Router();
outfitRouter.use(requireAuthApi);

function toPieceInput(row: q.GearPieceRow): GearPieceInput {
  const substats = [
    row.sub1_stat && row.sub1_value != null ? { stat: row.sub1_stat, value: row.sub1_value } : null,
    row.sub2_stat && row.sub2_value != null ? { stat: row.sub2_stat, value: row.sub2_value } : null,
    row.sub3_stat && row.sub3_value != null ? { stat: row.sub3_stat, value: row.sub3_value } : null,
    row.sub4_stat && row.sub4_value != null ? { stat: row.sub4_stat, value: row.sub4_value } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry != null);
  return {
    id: row.id,
    slot: row.slot,
    setKey: row.set_key,
    mainStat: row.main_stat,
    mainValue: row.main_value,
    mainBonus: row.main_bonus,
    substats,
    equippedHeroSlug: row.equipped_hero_slug,
  };
}

function parseRecord(value: unknown): Partial<Record<ScoreStatKey, number>> {
  if (!value || typeof value !== 'object') return {};
  const result: Partial<Record<ScoreStatKey, number>> = {};
  for (const key of SCORE_STAT_KEYS) {
    const raw = (value as Record<string, unknown>)[key];
    if (raw == null || raw === '') continue;
    const number = Number(raw);
    if (Number.isFinite(number)) result[key] = number;
  }
  return result;
}

outfitRouter.post(
  '/calculate',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const heroSlug = String(req.body?.hero_slug ?? '').trim();
    const hero = q.getHero(getAppDb(), accountId, heroSlug);
    if (!hero) {
      sendError(res, 'Hero not found.', 404);
      return;
    }
    const includeEquipped = req.body?.include_equipped === true;
    const results = optimizeLoadouts({
      hero: {
        hp: hero.hp,
        atk: hero.atk,
        def: hero.def,
        atkInterval: hero.atk_interval,
        rrAuto: hero.rr_auto,
        rrAttack: hero.rr_attack,
        rrAttacked: hero.rr_attacked,
      },
      pieces: q.listGear(getAppDb(), accountId).map(toPieceInput),
      weights: parseRecord(req.body?.weights),
      minimums: parseRecord(req.body?.minimums),
      desiredLeftSet:
        typeof req.body?.desired_left_set === 'string' ? req.body.desired_left_set : null,
      desiredRightSet:
        typeof req.body?.desired_right_set === 'string' ? req.body.desired_right_set : null,
      forceSets: req.body?.force_sets === true,
      includeEquippedHeroSlug: includeEquipped ? heroSlug : null,
    });
    json(res, { results });
  }),
);

outfitRouter.post(
  '/save',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const heroSlug = String(req.body?.hero_slug ?? '').trim();
    const hero = q.getHero(getAppDb(), accountId, heroSlug);
    if (!hero) {
      sendError(res, 'Hero not found.', 404);
      return;
    }
    const pieceIds = Array.isArray(req.body?.piece_ids)
      ? req.body.piece_ids.map((id: unknown) => Number(id))
      : [];
    if (pieceIds.length !== 5 || pieceIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
      sendError(res, 'Exactly five gear piece ids are required.');
      return;
    }
    const db = getAppDb();
    const pieces = pieceIds.map((id: number) => q.getGear(db, accountId, id));
    if (pieces.some((piece: q.GearPieceRow | undefined) => !piece)) {
      sendError(res, 'One or more pieces were not found.', 404);
      return;
    }
    const slots = new Set(pieces.map((piece: q.GearPieceRow | undefined) => piece?.slot));
    if (slots.size !== 5) {
      sendError(res, 'Loadout must include one piece of each slot.');
      return;
    }
    q.saveLoadout(db, accountId, heroSlug, pieceIds);
    json(res, { ok: true });
  }),
);
