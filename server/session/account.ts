import type { Request, Response } from 'express';

import { getAppDb } from '../db/appDb.js';
import * as q from '../db/queries.js';
import { requireClerkUserId, sendError } from '../http/handlers.js';

export function requireAccountId(req: Request, res: Response): number | null {
  const clerkUserId = requireClerkUserId(req);
  const db = getAppDb();
  const accounts = q.listAccounts(db, clerkUserId);
  let currentId = req.session.account_id ?? null;
  if (typeof currentId === 'number') {
    const owned = q.getAccount(db, currentId, clerkUserId);
    if (!owned) {
      currentId = null;
      req.session.account_id = undefined;
    }
  }
  if (currentId == null) {
    const active = accounts.find((account) => account.is_active === 1) ?? accounts[0];
    if (active) {
      currentId = active.id;
      req.session.account_id = active.id;
    }
  }
  if (currentId == null) {
    sendError(res, 'No game account selected. Create one first.', 400);
    return null;
  }
  return currentId;
}
