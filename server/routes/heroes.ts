import { Router } from 'express';

import { computeFinalStats } from '../../shared/formulas.js';
import {
  loadoutStatBag,
  type ArtifactStatInput,
  type GearPieceInput,
} from '../../shared/pieceStats.js';
import { requireAuthApi } from '../auth/middleware.js';
import { getAppDb } from '../db/appDb.js';
import * as q from '../db/queries.js';
import { asyncHandler, json, sendError } from '../http/handlers.js';
import { requireAccountId } from '../session/account.js';

export const heroesRouter = Router();
heroesRouter.use(requireAuthApi);

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

heroesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    json(res, { heroes: q.listHeroes(getAppDb(), accountId) });
  }),
);

heroesRouter.patch(
  '/:slug/stats',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const slug = String(req.params.slug ?? '').trim();
    const hero = q.getHero(getAppDb(), accountId, slug);
    if (!hero) {
      sendError(res, 'Hero not found.', 404);
      return;
    }
    const raw: unknown = req.body;
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      sendError(res, 'Stats must be non-negative numbers.');
      return;
    }
    const body = raw as Record<string, unknown>;
    const stats = {
      hp: Number(body.hp),
      atk: Number(body.atk),
      def: Number(body.def),
      atk_interval: Number(body.atk_interval),
      rr_auto: Number(body.rr_auto),
      rr_attack: Number(body.rr_attack),
      rr_attacked: Number(body.rr_attacked),
    };
    if (Object.values(stats).some((value) => !Number.isFinite(value) || value < 0)) {
      sendError(res, 'Stats must be non-negative numbers.');
      return;
    }
    q.upsertHeroStats(getAppDb(), accountId, slug, stats);
    json(res, { hero: q.getHero(getAppDb(), accountId, slug) });
  }),
);

heroesRouter.get(
  '/:slug/loadout',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const slug = String(req.params.slug ?? '').trim();
    const hero = q.getHero(getAppDb(), accountId, slug);
    if (!hero) {
      sendError(res, 'Hero not found.', 404);
      return;
    }
    const db = getAppDb();
    const gear = q.listGear(db, accountId).filter((piece) => piece.equipped_hero_slug === slug);
    const artifact = q.getEquippedArtifact(db, accountId, slug) ?? null;
    const pieces = gear.map(toPieceInput);
    const artifactInput: ArtifactStatInput | null = artifact
      ? {
          hp_base: artifact.hp_base,
          hp_bonus: artifact.hp_bonus,
          atk_base: artifact.atk_base,
          atk_bonus: artifact.atk_bonus,
          secondary_stat: artifact.secondary_stat,
          secondary_value: artifact.secondary_value,
        }
      : null;
    const stats =
      pieces.length > 0 || artifactInput
        ? computeFinalStats(
            {
              hp: hero.hp,
              atk: hero.atk,
              def: hero.def,
              atkInterval: hero.atk_interval,
              rrAuto: hero.rr_auto,
              rrAttack: hero.rr_attack,
              rrAttacked: hero.rr_attacked,
            },
            loadoutStatBag(pieces, artifactInput),
          )
        : null;
    json(res, { hero, gear, artifact, stats });
  }),
);

heroesRouter.patch(
  '/:slug/artifact',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const slug = String(req.params.slug ?? '').trim();
    const db = getAppDb();
    const hero = q.getHero(db, accountId, slug);
    if (!hero) {
      sendError(res, 'Hero not found.', 404);
      return;
    }
    const raw = req.body?.artifact_id;
    const artifactId = raw == null || raw === '' ? null : Number(raw);
    if (artifactId != null && (!Number.isInteger(artifactId) || artifactId <= 0)) {
      sendError(res, 'Invalid artifact id.');
      return;
    }
    if (artifactId != null && !q.getArtifact(db, accountId, artifactId)) {
      sendError(res, 'Artifact not found.', 404);
      return;
    }
    q.equipArtifact(db, accountId, slug, artifactId);
    json(res, { artifact: artifactId != null ? q.getArtifact(db, accountId, artifactId) : null });
  }),
);
