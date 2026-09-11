import { Router } from 'express';

import {
  ARTIFACT_LEVEL_MAX,
  ARTIFACT_LEVEL_MIN,
  ARTIFACT_PROMOTION_MAX,
  isArtifactSecondaryStat,
  maxLevelForPromotion,
  type ArtifactSecondaryStat,
} from '../../shared/catalog.js';
import { requireAuthApi } from '../auth/middleware.js';
import { getAppDb } from '../db/appDb.js';
import * as q from '../db/queries.js';
import { asyncHandler, json, sendError } from '../http/handlers.js';
import { decodeGearScreenshot, recognizeArtifactStats } from '../ocr/recognizeGear.js';
import { requireAccountId } from '../session/account.js';

export const artifactsRouter = Router();
artifactsRouter.use(requireAuthApi);

artifactsRouter.post(
  '/ocr',
  asyncHandler(async (req, res) => {
    const image = req.body && typeof req.body === 'object' ? req.body.image : undefined;
    const decoded = decodeGearScreenshot(image);
    if (typeof decoded === 'string') {
      sendError(res, decoded);
      return;
    }
    try {
      const result = await recognizeArtifactStats(decoded, q.listArtifactNames(getAppDb()));
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

function parseArtifactBody(body: unknown): q.ArtifactWrite | string {
  if (!body || typeof body !== 'object') return 'Invalid body.';
  const record = body as Record<string, unknown>;
  const catalogSlug = String(record.catalog_slug ?? '').trim();
  if (!catalogSlug) return 'Pick an artifact.';
  const catalog = q.listCatalogArtifacts(getAppDb()).find((row) => row.slug === catalogSlug);
  if (!catalog) return 'Unknown artifact.';
  const level = Number(record.level);
  const promotion = Number(record.promotion ?? 0);
  if (!Number.isInteger(level) || level < ARTIFACT_LEVEL_MIN || level > ARTIFACT_LEVEL_MAX) {
    return `Level must be ${ARTIFACT_LEVEL_MIN}-${ARTIFACT_LEVEL_MAX}.`;
  }
  if (!Number.isInteger(promotion) || promotion < 0 || promotion > ARTIFACT_PROMOTION_MAX) {
    return `Promotion must be 0-${ARTIFACT_PROMOTION_MAX}.`;
  }
  if (level > maxLevelForPromotion(promotion)) {
    return `Level ${level} is above promotion ${promotion} max.`;
  }
  const hpBase = Number(record.hp_base);
  const hpBonus = Number(record.hp_bonus ?? 0);
  const atkBase = Number(record.atk_base);
  const atkBonus = Number(record.atk_bonus ?? 0);
  if (!Number.isFinite(hpBase) || hpBase < 0) return 'HP base must be 0 or more.';
  if (!Number.isFinite(hpBonus) || hpBonus < 0) return 'HP bonus must be 0 or more.';
  if (!Number.isFinite(atkBase) || atkBase < 0) return 'ATK base must be 0 or more.';
  if (!Number.isFinite(atkBonus) || atkBonus < 0) return 'ATK bonus must be 0 or more.';
  const rawSecondary = record.secondary_stat;
  let secondaryStat: ArtifactSecondaryStat | null = null;
  let secondaryValue: number | null = null;
  if (typeof rawSecondary === 'string' && rawSecondary.trim()) {
    if (!isArtifactSecondaryStat(rawSecondary)) return 'Invalid secondary stat.';
    secondaryStat = rawSecondary;
    const value = Number(record.secondary_value);
    if (!Number.isFinite(value) || value < 0) return 'Invalid secondary value.';
    secondaryValue = value;
  }
  return {
    catalog_slug: catalogSlug,
    level,
    promotion,
    hp_base: hpBase,
    hp_bonus: hpBonus,
    atk_base: atkBase,
    atk_bonus: atkBonus,
    secondary_stat: secondaryStat,
    secondary_value: secondaryValue,
  };
}

artifactsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const db = getAppDb();
    json(res, {
      artifacts: q.listArtifacts(db, accountId),
      catalog: q.listCatalogArtifacts(db),
    });
  }),
);

artifactsRouter.post(
  '/',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const parsed = parseArtifactBody(req.body);
    if (typeof parsed === 'string') {
      sendError(res, parsed);
      return;
    }
    const db = getAppDb();
    const id = q.insertArtifact(db, accountId, parsed);
    json(res, { artifact: q.getArtifact(db, accountId, id) }, 201);
  }),
);

artifactsRouter.patch(
  '/:id',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const artifactId = Number(req.params.id);
    if (!Number.isInteger(artifactId) || artifactId <= 0) {
      sendError(res, 'Invalid artifact id.');
      return;
    }
    const parsed = parseArtifactBody(req.body);
    if (typeof parsed === 'string') {
      sendError(res, parsed);
      return;
    }
    const db = getAppDb();
    if (!q.getArtifact(db, accountId, artifactId)) {
      sendError(res, 'Artifact not found.', 404);
      return;
    }
    q.updateArtifact(db, accountId, artifactId, parsed);
    json(res, { artifact: q.getArtifact(db, accountId, artifactId) });
  }),
);

artifactsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const accountId = requireAccountId(req, res);
    if (accountId == null) return;
    const artifactId = Number(req.params.id);
    if (!Number.isInteger(artifactId) || artifactId <= 0) {
      sendError(res, 'Invalid artifact id.');
      return;
    }
    q.deleteArtifact(getAppDb(), accountId, artifactId);
    json(res, { ok: true });
  }),
);
