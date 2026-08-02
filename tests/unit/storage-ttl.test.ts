import { describe, expect, it } from 'vitest';
import {
  isPendingExpired,
  resolveEffectiveRecord,
} from '../../src/lib/storage';
import type { SiteRecord } from '../../src/lib/types';

function baseRecord(overrides: Partial<SiteRecord> = {}): SiteRecord {
  return {
    id: '1',
    origin: 'https://example.com',
    siteKey: 'example.com',
    scope: 'origin',
    methodId: 'github',
    methodLabel: 'GitHub',
    confidence: 'pending',
    lastSelectedAt: '2026-01-01T00:00:00.000Z',
    pageBadgeHidden: false,
    disabled: false,
    ...overrides,
  };
}

describe('pending TTL', () => {
  it('detects expired pending records', () => {
    const record = baseRecord({
      pendingExpiresAt: '2026-01-02T00:00:00.000Z',
    });
    expect(isPendingExpired(record, Date.parse('2026-01-03T00:00:00.000Z'))).toBe(
      true,
    );
    expect(isPendingExpired(record, Date.parse('2026-01-01T12:00:00.000Z'))).toBe(
      false,
    );
  });

  it('restores previous confirmed after pending expires', () => {
    const record = baseRecord({
      methodId: 'google',
      methodLabel: 'Google',
      pendingExpiresAt: '2026-01-02T00:00:00.000Z',
      previousConfirmed: {
        methodId: 'github',
        methodLabel: 'GitHub',
        profileLabel: 'Work',
        lastConfirmedAt: '2025-12-01T00:00:00.000Z',
      },
    });

    // Force expired by freezing "now" via isPendingExpired path inside resolve —
    // resolveEffectiveRecord uses Date.now(); stub via expired timestamp in the past.
    const expired = baseRecord({
      ...record,
      pendingExpiresAt: '2000-01-01T00:00:00.000Z',
    });
    const restored = resolveEffectiveRecord(expired);
    expect(restored?.methodId).toBe('github');
    expect(restored?.confidence).toBe('confirmed');
    expect(restored?.profileLabel).toBe('Work');
  });

  it('returns null when pending expires with no prior confirmed', () => {
    const expired = baseRecord({
      pendingExpiresAt: '2000-01-01T00:00:00.000Z',
    });
    expect(resolveEffectiveRecord(expired)).toBeNull();
  });

  it('keeps confirmed records', () => {
    const record = baseRecord({ confidence: 'confirmed' });
    expect(resolveEffectiveRecord(record)?.confidence).toBe('confirmed');
  });
});
