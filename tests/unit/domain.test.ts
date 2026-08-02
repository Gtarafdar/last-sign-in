import { describe, expect, it } from 'vitest';
import {
  defaultScopeForHost,
  isMultiTenantHost,
  recordsMatchSite,
  registrableDomain,
  siteKeyFromUrl,
} from '../../src/lib/domain';
import { getMethodAbbreviation } from '../../src/lib/methods';

describe('domain helpers', () => {
  it('extracts site key', () => {
    expect(siteKeyFromUrl('https://App.Example.com/login?x=1')).toBe(
      'app.example.com',
    );
  });

  it('computes registrable domain heuristically', () => {
    expect(registrableDomain('app.example.com')).toBe('example.com');
    expect(registrableDomain('foo.bar.co.uk')).toBe('bar.co.uk');
  });

  it('flags multi-tenant hosts', () => {
    expect(isMultiTenantHost('my-app.vercel.app')).toBe(true);
    expect(isMultiTenantHost('example.com')).toBe(false);
  });

  it('defaults to origin scope', () => {
    expect(defaultScopeForHost('example.com')).toBe('origin');
  });

  it('matches origin scope exactly', () => {
    expect(
      recordsMatchSite(
        'https://app.example.com',
        'app.example.com',
        'origin',
        'https://app.example.com',
      ),
    ).toBe(true);
    expect(
      recordsMatchSite(
        'https://app.example.com',
        'app.example.com',
        'origin',
        'https://admin.example.com',
      ),
    ).toBe(false);
  });
});

describe('toolbar abbreviation', () => {
  it('prefers profile shortcuts', () => {
    expect(getMethodAbbreviation('github', 'Work')).toBe('W');
    expect(getMethodAbbreviation('github', 'Personal')).toBe('P');
    expect(getMethodAbbreviation('github')).toBe('GH');
    expect(getMethodAbbreviation('google')).toBe('G');
  });
});
