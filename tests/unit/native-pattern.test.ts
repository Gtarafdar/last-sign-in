import { describe, expect, it } from 'vitest';

const NATIVE_LAST_USED_RE =
  /\blast\s*used\b|\blast\s*sign[-\s]?in\b|\bpreviously\s*used\b|\brecently\s*used\b/i;

describe('native last-used pattern', () => {
  it('matches Lovable / Supabase copy', () => {
    expect(NATIVE_LAST_USED_RE.test('Last used')).toBe(true);
    expect(NATIVE_LAST_USED_RE.test('LAST USED')).toBe(true);
    expect(NATIVE_LAST_USED_RE.test('Previously used')).toBe(true);
  });

  it('does not match unrelated UI', () => {
    expect(NATIVE_LAST_USED_RE.test('Continue with Google')).toBe(false);
    expect(NATIVE_LAST_USED_RE.test('Use last password')).toBe(false);
  });
});
