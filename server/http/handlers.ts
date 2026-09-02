import type { NextFunction, Request, Response } from 'express';

import { getClerkAuthState } from '../auth/middleware.js';

export function requireClerkUserId(req: Request): string {
  const state = getClerkAuthState(req);
  if (!state.userId) {
    const error = new Error('Unauthorized');
    (error as { status?: number }).status = 401;
    throw error;
  }
  return state.userId;
}

export function json(res: Response, data: object, status = 200): void {
  res.status(status).json(data);
}

export function sendError(res: Response, message: string, status = 400): void {
  res.status(status).json({ error: message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => void | Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
