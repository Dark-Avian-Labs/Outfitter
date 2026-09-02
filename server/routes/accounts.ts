import { Router } from 'express';

import { requireAdmin, requireAuthApi } from '../auth/middleware.js';
import { getAppDb } from '../db/appDb.js';
import * as q from '../db/queries.js';
import { asyncHandler, json, requireClerkUserId, sendError } from '../http/handlers.js';
import { importCodexCatalog } from '../import/codexCatalog.js';

export const accountsRouter = Router();

accountsRouter.use(requireAuthApi);

accountsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const clerkUserId = requireClerkUserId(req);
    const db = getAppDb();
    const accounts = q.listAccounts(db, clerkUserId);
    const current =
      accounts.find((account) => account.id === req.session.account_id) ??
      accounts.find((account) => account.is_active === 1) ??
      null;
    if (current && req.session.account_id !== current.id) {
      req.session.account_id = current.id;
    }
    json(res, { accounts, current_account_id: current?.id ?? null });
  }),
);

accountsRouter.post(
  '/',
  asyncHandler((req, res) => {
    const clerkUserId = requireClerkUserId(req);
    const accountName = String(req.body?.account_name ?? '').trim();
    if (!accountName || accountName.length > 128) {
      sendError(res, 'Account name is required (max 128 characters).');
      return;
    }
    const db = getAppDb();
    const account = q.createAccount(db, clerkUserId, accountName);
    if (account.is_active === 1) req.session.account_id = account.id;
    json(res, { account }, 201);
  }),
);

accountsRouter.post(
  '/switch',
  asyncHandler((req, res) => {
    const clerkUserId = requireClerkUserId(req);
    const accountId = Number(req.body?.account_id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      sendError(res, 'account_id is required.');
      return;
    }
    const db = getAppDb();
    const account = q.setActiveAccount(db, accountId, clerkUserId);
    req.session.account_id = account.id;
    json(res, { account });
  }),
);

accountsRouter.patch(
  '/:id',
  asyncHandler((req, res) => {
    const clerkUserId = requireClerkUserId(req);
    const accountId = Number(req.params.id);
    const accountName = String(req.body?.account_name ?? '').trim();
    if (!Number.isInteger(accountId) || accountId <= 0) {
      sendError(res, 'Invalid account id.');
      return;
    }
    if (!accountName || accountName.length > 128) {
      sendError(res, 'Account name is required (max 128 characters).');
      return;
    }
    q.renameAccount(getAppDb(), accountId, clerkUserId, accountName);
    json(res, { ok: true });
  }),
);

accountsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const clerkUserId = requireClerkUserId(req);
    const accountId = Number(req.params.id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      sendError(res, 'Invalid account id.');
      return;
    }
    q.deleteAccount(getAppDb(), accountId, clerkUserId);
    if (req.session.account_id === accountId) req.session.account_id = undefined;
    json(res, { ok: true });
  }),
);

export const adminRouter = Router();
adminRouter.use(requireAuthApi, requireAdmin);
adminRouter.get(
  '/catalog',
  asyncHandler((_req, res) => {
    json(res, q.catalogStatus(getAppDb()));
  }),
);
adminRouter.post(
  '/import-catalog',
  asyncHandler((_req, res) => {
    const summary = importCodexCatalog();
    json(res, summary);
  }),
);
