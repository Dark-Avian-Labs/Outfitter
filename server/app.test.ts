import Database from 'better-sqlite3';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppBundle } from './app.js';
import { createApp } from './app.js';

let bundle: AppBundle;

beforeAll(() => {
  bundle = createApp({ sessionDb: new Database(':memory:') });
});

afterAll(() => {
  bundle.sessionStore.dispose();
  bundle.sessionDb.close();
});

describe('health endpoints', () => {
  it('GET /healthz responds ok without creating a session cookie', async () => {
    const res = await request(bundle.app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('GET /readyz probes the session DB', async () => {
    const res = await request(bundle.app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('GET /api/health responds ok', async () => {
    const res = await request(bundle.app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /api/version returns the package version', async () => {
    const res = await request(bundle.app).get('/api/version');
    expect(res.status).toBe(200);
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version.length).toBeGreaterThan(0);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('security headers', () => {
  it('sets helmet headers including a CSP with Clerk origins', async () => {
    const res = await request(bundle.app).get('/healthz');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['content-security-policy']).toContain('https://challenges.cloudflare.com');
    expect(res.headers['content-security-policy']).toContain('https://*.protect.clerk.com');
  });

  it('emits rate limit headers on API routes', async () => {
    const res = await request(bundle.app).get('/api/health');
    const hasRateLimitHeader = Boolean(res.headers['ratelimit'] ?? res.headers['ratelimit-limit']);
    expect(hasRateLimitHeader).toBe(true);
  });
});

describe('request IDs', () => {
  it('echoes a well-formed X-Request-Id', async () => {
    const res = await request(bundle.app).get('/healthz').set('X-Request-Id', 'abc-123-def-456');
    expect(res.headers['x-request-id']).toBe('abc-123-def-456');
  });

  it('replaces a malformed X-Request-Id', async () => {
    const res = await request(bundle.app).get('/healthz').set('X-Request-Id', 'bad id! <script>');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).not.toBe('bad id! <script>');
  });
});

describe('CSRF protection', () => {
  it('GET /api/csrf issues a token and a session cookie', async () => {
    const res = await request(bundle.app).get('/api/csrf');
    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toBeTruthy();
    expect(res.headers['set-cookie']?.[0]).toContain('outfitter.sid');
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('rejects state-changing requests without a token', async () => {
    const res = await request(bundle.app).post('/api/anything').send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_INVALID');
    expect(res.headers['x-csrf-error']).toBe('1');
  });

  it('accepts state-changing requests with a valid token', async () => {
    const agent = request.agent(bundle.app);
    const csrfRes = await agent.get('/api/csrf');
    const token = csrfRes.body.csrfToken as string;

    const res = await agent.post('/api/anything').set('X-CSRF-Token', token).send({});
    expect(res.status).toBe(404);
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    const agent = request.agent(bundle.app);
    const csrfRes = await agent.get('/api/csrf');
    const token = csrfRes.body.csrfToken as string;

    const res = await agent
      .post('/api/anything')
      .set('X-CSRF-Token', token)
      .set('Origin', 'https://evil.example')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_ORIGIN_INVALID');
  });

  it('rejects cross-site fetch mode on state-changing requests', async () => {
    const agent = request.agent(bundle.app);
    const csrfRes = await agent.get('/api/csrf');
    const token = csrfRes.body.csrfToken as string;

    const res = await agent
      .post('/api/anything')
      .set('X-CSRF-Token', token)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_ORIGIN_INVALID');
  });
});

describe('auth endpoints (Clerk not configured in tests)', () => {
  it('GET /api/auth/me responds 401 when signed out', async () => {
    const res = await request(bundle.app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('body limits', () => {
  it('rejects JSON bodies over 100kb', async () => {
    const bigPayload = { data: 'x'.repeat(150 * 1024) };
    const res = await request(bundle.app).post('/api/anything').send(bigPayload);
    expect(res.status).toBe(413);
  });
});

describe('API 404 handling', () => {
  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(bundle.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
