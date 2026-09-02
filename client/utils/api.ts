export type ClerkTokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

let cachedToken = '';
let getClerkToken: ClerkTokenGetter | null = null;

export function setClerkTokenGetter(getter: ClerkTokenGetter | null): void {
  getClerkToken = getter;
}

async function resolveClerkToken(skipCache = false): Promise<string | null> {
  if (!getClerkToken) {
    return null;
  }
  try {
    const token = await getClerkToken({ skipCache });
    return token ?? null;
  } catch {
    return null;
  }
}

async function fetchCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/csrf', { credentials: 'include', cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { csrfToken?: string };
      return data.csrfToken ?? '';
    }
  } catch {
    // ignore
  }
  return '';
}

async function getCsrfToken(): Promise<string> {
  if (!cachedToken) {
    cachedToken = await fetchCsrfToken();
  }
  return cachedToken;
}

export function clearCsrfToken(): void {
  cachedToken = '';
}

function isCsrfRejection(response: Response): boolean {
  return response.status === 403 && response.headers.get('X-CSRF-Error') === '1';
}

function withClerkAuthorization(headers: Headers, token: string | null): Headers {
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }
  return headers;
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const needsCsrf = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  const mergeHeaders = async (csrfToken: string, clerkToken: string | null): Promise<Headers> => {
    const headers = new Headers(init?.headers);
    if (needsCsrf && csrfToken) headers.set('X-CSRF-Token', csrfToken);
    withClerkAuthorization(headers, clerkToken);
    if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  };

  const csrfToken = needsCsrf ? await getCsrfToken() : '';
  let clerkToken = await resolveClerkToken(false);
  let response = await fetch(url, {
    ...init,
    credentials: init?.credentials ?? 'include',
    cache: init?.cache ?? 'no-store',
    headers: await mergeHeaders(csrfToken, clerkToken),
  });

  if (response.status === 401 && getClerkToken) {
    const refreshed = await resolveClerkToken(true);
    if (refreshed && refreshed !== clerkToken) {
      clerkToken = refreshed;
      response = await fetch(url, {
        ...init,
        credentials: init?.credentials ?? 'include',
        cache: init?.cache ?? 'no-store',
        headers: await mergeHeaders(csrfToken, clerkToken),
      });
    }
  }

  if (needsCsrf && isCsrfRejection(response)) {
    clearCsrfToken();
    const freshToken = await getCsrfToken();
    if (freshToken && freshToken !== csrfToken) {
      return fetch(url, {
        ...init,
        credentials: init?.credentials ?? 'include',
        cache: init?.cache ?? 'no-store',
        headers: await mergeHeaders(freshToken, clerkToken),
      });
    }
  }

  return response;
}
