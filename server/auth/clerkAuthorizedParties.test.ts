import { afterEach, describe, expect, it } from 'vitest';

import { getClerkAuthorizedParties, isAllowedMutatingOrigin, isSameHostOrigin } from './clerkAuthorizedParties.js';

describe('getClerkAuthorizedParties', () => {
  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    APP_PUBLIC_BASE_URL: process.env.APP_PUBLIC_BASE_URL,
    ALLOWED_APP_ORIGINS: process.env.ALLOWED_APP_ORIGINS,
  };

  afterEach(() => {
    process.env.NODE_ENV = previousEnv.NODE_ENV;
    process.env.APP_PUBLIC_BASE_URL = previousEnv.APP_PUBLIC_BASE_URL;
    process.env.ALLOWED_APP_ORIGINS = previousEnv.ALLOWED_APP_ORIGINS;
  });

  it('includes app public URL and configured sibling origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_PUBLIC_BASE_URL = 'https://outfitter.example.com/';
    process.env.ALLOWED_APP_ORIGINS = 'https://codex.example.com,https://armory.example.com';

    expect(getClerkAuthorizedParties()).toEqual([
      'https://outfitter.example.com',
      'https://codex.example.com',
      'https://armory.example.com',
    ]);
  });

  it('includes localhost origins in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_PUBLIC_BASE_URL = 'http://localhost:3004';
    delete process.env.ALLOWED_APP_ORIGINS;

    const parties = getClerkAuthorizedParties();
    expect(parties).toContain('http://localhost:3004');
    expect(parties).toContain('http://localhost:5174');
  });
});

describe('isAllowedMutatingOrigin', () => {
  it('allows same-host origins even when they are not in the allowlist', () => {
    expect(isSameHostOrigin('127.0.0.1:3004', 'http://127.0.0.1:3004')).toBe(true);
    expect(isAllowedMutatingOrigin('http://127.0.0.1:3004', '127.0.0.1:3004')).toBe(true);
  });

  it('rejects unrelated origins', () => {
    expect(isAllowedMutatingOrigin('https://evil.example', '127.0.0.1:3004')).toBe(false);
  });
});
