import { getHostname, getOrigin } from './privacy';
import type { SiteScope } from './types';

/** Known multi-tenant / shared platforms — always prefer exact origin. */
const MULTI_TENANT_SUFFIXES = [
  'vercel.app',
  'netlify.app',
  'pages.dev',
  'web.app',
  'firebaseapp.com',
  'herokuapp.com',
  'railway.app',
  'onrender.com',
  'github.io',
  'gitlab.io',
  'azurewebsites.net',
  'cloudfront.net',
];

export function isMultiTenantHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return MULTI_TENANT_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function siteKeyFromUrl(raw: string): string {
  const hostname = getHostname(raw);
  if (!hostname) return raw;
  return hostname.toLowerCase();
}

export function originFromUrl(raw: string): string {
  return getOrigin(raw) ?? raw;
}

/**
 * Simple eTLD+1 heuristic without a PSL dependency.
 * Good enough for common cases; multi-tenant hosts stay exact-origin.
 */
export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;

  const parts = host.split('.');
  if (parts.length <= 2) return host;

  // Common multi-part public suffixes (heuristic subset).
  const multiPart = new Set([
    'co.uk',
    'org.uk',
    'ac.uk',
    'gov.uk',
    'co.jp',
    'com.au',
    'com.br',
    'co.nz',
    'co.za',
  ]);
  const lastTwo = parts.slice(-2).join('.');
  if (multiPart.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

export function defaultScopeForHost(hostname: string): SiteScope {
  if (isMultiTenantHost(hostname)) return 'origin';
  return 'origin'; // plan: exact-origin default for safety in MVP
}

export function recordsMatchSite(
  recordOrigin: string,
  recordSiteKey: string,
  scope: SiteScope,
  pageOrigin: string,
): boolean {
  if (scope === 'origin') {
    return recordOrigin === pageOrigin;
  }
  const pageHost = getHostname(pageOrigin);
  if (!pageHost) return false;
  return (
    pageHost === recordSiteKey ||
    pageHost.endsWith(`.${recordSiteKey}`) ||
    registrableDomain(pageHost) === recordSiteKey
  );
}

export function recordLookupKey(origin: string, scope: SiteScope, siteKey: string): string {
  return scope === 'origin' ? `origin:${origin}` : `host:${siteKey}`;
}
