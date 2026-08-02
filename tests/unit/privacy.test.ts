import { describe, expect, it } from 'vitest';
import {
  assertNoSecretsInRecord,
  isForbiddenKey,
  sanitizeForStorage,
  stripUrlSecrets,
} from '../../src/lib/privacy';

describe('stripUrlSecrets', () => {
  it('removes query and hash', () => {
    expect(
      stripUrlSecrets(
        'https://login.microsoftonline.com/common/oauth2?code=SECRET#frag',
      ),
    ).toBe('https://login.microsoftonline.com/common/oauth2');
  });

  it('handles bare paths without scheme', () => {
    expect(stripUrlSecrets('/login?token=abc#x')).toBe('/login');
  });
});

describe('forbidden keys', () => {
  it('flags credential-like keys', () => {
    expect(isForbiddenKey('password')).toBe(true);
    expect(isForbiddenKey('access_token')).toBe(true);
    expect(isForbiddenKey('methodId')).toBe(false);
  });

  it('strips forbidden keys from objects', () => {
    const clean = sanitizeForStorage({
      methodId: 'github',
      password: 'secret',
      email: 'a@b.com',
      url: 'https://example.com/cb?code=1',
    });
    expect(clean).toEqual({
      methodId: 'github',
      url: 'https://example.com/cb',
    });
  });

  it('assertNoSecretsInRecord throws on password', () => {
    expect(() =>
      assertNoSecretsInRecord({ password: 'x' }),
    ).toThrow(/password/i);
  });
});
