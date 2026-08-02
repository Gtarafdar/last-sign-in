import type { AuthMethodId } from './types';

export interface AuthMethodDef {
  id: AuthMethodId;
  label: string;
  abbreviation: string;
  /** Whole-word / phrase patterns matched against normalized accessible names. */
  phrases: string[];
  /** Hostnames that indicate this provider (href destination). */
  hosts: string[];
}

export const AUTH_METHODS: AuthMethodDef[] = [
  {
    id: 'google',
    label: 'Google',
    abbreviation: 'G',
    phrases: [
      'continue with google',
      'sign in with google',
      'sign up with google',
      'sign in with google.com',
      'log in with google',
      'login with google',
      'google',
    ],
    hosts: ['accounts.google.com', 'google.com'],
  },
  {
    id: 'github',
    label: 'GitHub',
    abbreviation: 'GH',
    phrases: [
      'continue with github',
      'sign in with github',
      'sign up with github',
      'log in with github',
      'login with github',
      'github',
    ],
    hosts: ['github.com', 'api.github.com'],
  },
  {
    id: 'microsoft',
    label: 'Microsoft',
    abbreviation: 'MS',
    phrases: [
      'continue with microsoft',
      'sign in with microsoft',
      'log in with microsoft',
      'login with microsoft',
      'continue with azure',
      'microsoft',
      'azure ad',
      'office 365',
    ],
    hosts: [
      'login.microsoftonline.com',
      'login.live.com',
      'account.microsoft.com',
    ],
  },
  {
    id: 'apple',
    label: 'Apple',
    abbreviation: 'AP',
    phrases: [
      'continue with apple',
      'sign in with apple',
      'sign up with apple',
      'log in with apple',
      'login with apple',
      'apple',
    ],
    hosts: ['appleid.apple.com'],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    abbreviation: 'FB',
    phrases: [
      'continue with facebook',
      'sign in with facebook',
      'sign up with facebook',
      'log in with facebook',
      'login with facebook',
      'facebook',
      'fb',
    ],
    hosts: ['facebook.com', 'www.facebook.com'],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    abbreviation: 'LI',
    phrases: [
      'continue with linkedin',
      'sign in with linkedin',
      'log in with linkedin',
      'login with linkedin',
      'linkedin',
    ],
    hosts: ['linkedin.com', 'www.linkedin.com'],
  },
  {
    id: 'x',
    label: 'X',
    abbreviation: 'X',
    phrases: [
      'continue with x',
      'sign in with x',
      'continue with twitter',
      'sign in with twitter',
      'log in with twitter',
      'twitter',
    ],
    hosts: ['twitter.com', 'x.com', 'api.twitter.com'],
  },
  {
    id: 'sso',
    label: 'SSO',
    abbreviation: 'SSO',
    phrases: [
      'continue with sso',
      'sign in with sso',
      'log in with sso',
      'login with sso',
      'single sign-on',
      'single sign on',
      'enterprise sso',
      'sso',
      'saml',
      'okta',
      'auth0',
    ],
    hosts: ['okta.com', 'auth0.com'],
  },
  {
    id: 'passkey',
    label: 'Passkey',
    abbreviation: 'PK',
    phrases: [
      'continue with passkey',
      'sign in with passkey',
      'sign in with a passkey',
      'use passkey',
      'passkey',
      'webauthn',
      'security key',
    ],
    hosts: [],
  },
  {
    id: 'email',
    label: 'Email',
    abbreviation: 'EM',
    phrases: [
      'continue with email',
      'sign in with email',
      'log in with email',
      'login with email',
      'email magic link',
      'magic link',
      'email',
    ],
    hosts: [],
  },
  {
    id: 'password',
    label: 'Password',
    abbreviation: 'PW',
    phrases: [
      'sign in',
      'log in',
      'login',
      'sign in with password',
      'log in with password',
    ],
    hosts: [],
  },
];

export const METHOD_BY_ID: Record<AuthMethodId, AuthMethodDef> = (() => {
  const map = {} as Record<AuthMethodId, AuthMethodDef>;
  for (const method of AUTH_METHODS) {
    map[method.id] = method;
  }
  map.custom = {
    id: 'custom',
    label: 'Custom',
    abbreviation: 'C',
    phrases: [],
    hosts: [],
  };
  return map;
})();

export function getMethodAbbreviation(
  methodId: AuthMethodId,
  profileLabel?: string,
): string {
  if (profileLabel) {
    const cleaned = profileLabel.trim();
    if (/^work$/i.test(cleaned)) return 'W';
    if (/^personal$/i.test(cleaned)) return 'P';
    const letters = cleaned.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    if (letters.length > 0) return letters;
  }
  return METHOD_BY_ID[methodId]?.abbreviation ?? 'C';
}

export function getMethodLabel(methodId: AuthMethodId, fallback?: string): string {
  if (methodId === 'custom' && fallback) return fallback;
  return METHOD_BY_ID[methodId]?.label ?? fallback ?? 'Custom';
}
