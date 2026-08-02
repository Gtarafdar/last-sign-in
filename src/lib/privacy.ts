/**
 * Privacy helpers: strip secrets from URLs and refuse forbidden field shapes.
 */

const FORBIDDEN_KEYS = new Set([
  'password',
  'passwd',
  'email',
  'username',
  'user',
  'phone',
  'otp',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'cookies',
  'session',
  'sessionid',
  'code',
  'secret',
]);

/** Strip query string and hash from a URL string. */
export function stripUrlSecrets(raw: string): string {
  try {
    const url = new URL(raw);
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return `${url.origin}${path}`;
  } catch {
    const noHash = raw.split('#')[0] ?? '';
    return noHash.split('?')[0] ?? '';
  }
}

export function getOrigin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function getHostname(raw: string): string | null {
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

/** True if an object key looks like a credential field we must never persist. */
export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key.toLowerCase());
}

/**
 * Deep-scrub an object before storage: drop forbidden keys and strip URL fields.
 * Returns a plain JSON-safe clone.
 */
export function sanitizeForStorage<T>(value: T): T {
  return scrub(value) as T;
}

function scrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) return stripUrlSecrets(value);
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenKey(key)) continue;
    out[key] = scrub(child);
  }
  return out;
}

export function assertNoSecretsInRecord(record: Record<string, unknown>): void {
  const json = JSON.stringify(record);
  // Soft checks for common secret shapes that should never appear.
  if (/"password"\s*:/i.test(json)) {
    throw new Error('Privacy violation: password field in storage payload');
  }
  if (/"access_token"\s*:/i.test(json) || /"refresh_token"\s*:/i.test(json)) {
    throw new Error('Privacy violation: token field in storage payload');
  }
}
