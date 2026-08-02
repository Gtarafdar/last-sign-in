import type {
  AuthMethodId,
  Confidence,
  MethodSelection,
  Settings,
  SiteRecord,
  SiteScope,
  SiteState,
  StorageEnvelope,
} from './types';
import { EMPTY_STORAGE, DEFAULT_SETTINGS } from './types';
import {
  defaultScopeForHost,
  originFromUrl,
  recordLookupKey,
  recordsMatchSite,
  siteKeyFromUrl,
} from './domain';
import { assertNoSecretsInRecord, sanitizeForStorage } from './privacy';
import { getMethodLabel } from './methods';

const STORAGE_KEY = 'lastSignIn';

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export async function readStorage(): Promise<StorageEnvelope> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as StorageEnvelope | undefined;
  if (!raw || raw.schemaVersion !== 1) {
    return structuredClone(EMPTY_STORAGE);
  }
  return {
    ...EMPTY_STORAGE,
    ...raw,
    settings: { ...DEFAULT_SETTINGS, ...raw.settings },
    records: raw.records ?? {},
    enabledOrigins: raw.enabledOrigins ?? [],
  };
}

export async function writeStorage(envelope: StorageEnvelope): Promise<void> {
  const clean = sanitizeForStorage(envelope);
  assertNoSecretsInRecord(clean as unknown as Record<string, unknown>);
  await chrome.storage.local.set({ [STORAGE_KEY]: clean });
}

export async function getSettings(): Promise<Settings> {
  const store = await readStorage();
  return store.settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const store = await readStorage();
  store.settings = { ...store.settings, ...patch };
  await writeStorage(store);
  return store.settings;
}

export function isPendingExpired(record: SiteRecord, now = Date.now()): boolean {
  if (record.confidence !== 'pending' || !record.pendingExpiresAt) return false;
  return new Date(record.pendingExpiresAt).getTime() <= now;
}

export function resolveEffectiveRecord(record: SiteRecord): SiteRecord | null {
  if (record.disabled) return null;
  if (record.confidence === 'pending' && isPendingExpired(record)) {
    if (record.previousConfirmed) {
      return {
        ...record,
        methodId: record.previousConfirmed.methodId,
        methodLabel: record.previousConfirmed.methodLabel,
        profileLabel: record.previousConfirmed.profileLabel,
        confidence: 'confirmed',
        lastConfirmedAt: record.previousConfirmed.lastConfirmedAt,
        pendingExpiresAt: undefined,
        previousConfirmed: undefined,
      };
    }
    return null;
  }
  return record;
}

export async function findRecordForOrigin(pageUrl: string): Promise<SiteRecord | null> {
  const store = await readStorage();
  const origin = originFromUrl(pageUrl);
  const siteKey = siteKeyFromUrl(pageUrl);

  // Prefer exact origin match, then host-scoped
  let best: SiteRecord | null = null;
  for (const record of Object.values(store.records)) {
    if (!recordsMatchSite(record.origin, record.siteKey, record.scope, origin)) {
      continue;
    }
    const effective = resolveEffectiveRecord(record);
    if (!effective) continue;
    if (record.scope === 'origin' && record.origin === origin) return effective;
    best = effective;
  }
  return best;
}

export async function getSiteState(pageUrl: string): Promise<SiteState> {
  const store = await readStorage();
  const origin = originFromUrl(pageUrl);
  const siteKey = siteKeyFromUrl(pageUrl);
  const record = await findRecordForOrigin(pageUrl);
  const enabled = store.enabledOrigins.includes(origin);

  let hasHostPermission = false;
  try {
    hasHostPermission = await chrome.permissions.contains({
      origins: [`${origin}/*`],
    });
  } catch {
    hasHostPermission = false;
  }

  return { origin, siteKey, record, enabled, hasHostPermission };
}

export async function recordMethodSelection(
  selection: MethodSelection,
  settings?: Settings,
): Promise<SiteRecord> {
  const store = await readStorage();
  const cfg = settings ?? store.settings;
  const scope: SiteScope = cfg.defaultScope;
  const key = recordLookupKey(selection.origin, scope, selection.siteKey);
  const existing = store.records[key];
  const selectedAt = selection.selectedAt || nowIso();

  let previousConfirmed = existing?.previousConfirmed;
  if (existing && (existing.confidence === 'confirmed' || existing.confidence === 'manual')) {
    if (existing.methodId !== selection.methodId) {
      previousConfirmed = {
        methodId: existing.methodId,
        methodLabel: existing.methodLabel,
        profileLabel: existing.profileLabel,
        lastConfirmedAt: existing.lastConfirmedAt,
      };
    }
  }

  const pendingExpiresAt =
    cfg.pendingTtlDays == null
      ? undefined
      : addDays(selectedAt, cfg.pendingTtlDays);

  const record: SiteRecord = {
    id: existing?.id ?? newId(),
    origin: selection.origin,
    siteKey: selection.siteKey,
    scope,
    methodId: selection.methodId,
    methodLabel: selection.methodLabel || getMethodLabel(selection.methodId),
    profileLabel: existing?.profileLabel,
    confidence: 'pending',
    lastSelectedAt: selectedAt,
    lastConfirmedAt: existing?.lastConfirmedAt,
    pendingExpiresAt,
    pageBadgeHidden: existing?.pageBadgeHidden ?? false,
    disabled: false,
    previousConfirmed,
  };

  store.records[key] = record;
  if (!store.enabledOrigins.includes(selection.origin)) {
    store.enabledOrigins.push(selection.origin);
  }
  await writeStorage(store);
  return record;
}

export async function confirmRecord(
  origin: string,
  siteKey: string,
): Promise<SiteRecord | null> {
  const store = await readStorage();
  const keyOrigin = recordLookupKey(origin, 'origin', siteKey);
  const keyHost = recordLookupKey(origin, 'host', siteKey);
  const record = store.records[keyOrigin] ?? store.records[keyHost];
  if (!record) return null;

  const confirmedAt = nowIso();
  record.confidence = 'confirmed';
  record.lastConfirmedAt = confirmedAt;
  record.pendingExpiresAt = undefined;
  record.previousConfirmed = undefined;
  await writeStorage(store);
  return record;
}

export interface SafeSiteRecordPatch {
  origin: string;
  siteKey: string;
  methodId?: AuthMethodId;
  methodLabel?: string;
  profileLabel?: string | null;
  confidence?: Confidence;
  pageBadgeHidden?: boolean;
  disabled?: boolean;
  scope?: SiteScope;
}

export async function updateSiteRecord(
  patch: SafeSiteRecordPatch,
): Promise<SiteRecord> {
  const store = await readStorage();
  const scope = patch.scope ?? store.settings.defaultScope;
  const key = recordLookupKey(patch.origin, scope, patch.siteKey);
  const existing = store.records[key];
  const now = nowIso();

  const record: SiteRecord = {
    id: existing?.id ?? newId(),
    origin: patch.origin,
    siteKey: patch.siteKey,
    scope,
    methodId: patch.methodId ?? existing?.methodId ?? 'custom',
    methodLabel:
      patch.methodLabel ??
      existing?.methodLabel ??
      getMethodLabel(patch.methodId ?? existing?.methodId ?? 'custom'),
    profileLabel:
      patch.profileLabel === null
        ? undefined
        : (patch.profileLabel ?? existing?.profileLabel),
    confidence: patch.confidence ?? existing?.confidence ?? 'manual',
    lastSelectedAt: existing?.lastSelectedAt ?? now,
    lastConfirmedAt:
      patch.confidence === 'confirmed' ||
      patch.confidence === 'manual' ||
      existing?.confidence === 'confirmed' ||
      existing?.confidence === 'manual'
        ? (existing?.lastConfirmedAt ?? now)
        : existing?.lastConfirmedAt,
    pendingExpiresAt:
      patch.confidence === 'pending'
        ? existing?.pendingExpiresAt
        : undefined,
    pageBadgeHidden: patch.pageBadgeHidden ?? existing?.pageBadgeHidden ?? false,
    disabled: patch.disabled ?? existing?.disabled ?? false,
    previousConfirmed: undefined,
  };

  if (patch.confidence === 'manual' || patch.methodId) {
    record.confidence = patch.confidence ?? 'manual';
    if (record.confidence === 'manual') {
      record.lastConfirmedAt = now;
      record.pendingExpiresAt = undefined;
    }
  }

  // Cap profile label (room for a short name or email reminder)
  if (record.profileLabel) {
    record.profileLabel = record.profileLabel.trim().slice(0, 64);
    if (!record.profileLabel) delete record.profileLabel;
  }

  store.records[key] = record;
  await writeStorage(store);
  return record;
}

export async function deleteSiteRecord(
  origin: string,
  siteKey: string,
): Promise<void> {
  const store = await readStorage();
  delete store.records[recordLookupKey(origin, 'origin', siteKey)];
  delete store.records[recordLookupKey(origin, 'host', siteKey)];
  await writeStorage(store);
}

export async function deleteAllRecords(): Promise<void> {
  const store = await readStorage();
  store.records = {};
  await writeStorage(store);
}

export async function setOriginEnabled(
  origin: string,
  enabled: boolean,
): Promise<void> {
  const store = await readStorage();
  const set = new Set(store.enabledOrigins);
  if (enabled) set.add(origin);
  else set.delete(origin);
  store.enabledOrigins = Array.from(set);
  await writeStorage(store);
}

export async function listRecords(): Promise<SiteRecord[]> {
  const store = await readStorage();
  return Object.values(store.records)
    .map((r) => resolveEffectiveRecord(r))
    .filter((r): r is SiteRecord => r != null)
    .sort((a, b) => b.lastSelectedAt.localeCompare(a.lastSelectedAt));
}

export async function cleanupExpired(): Promise<void> {
  const store = await readStorage();
  let changed = false;
  for (const [key, record] of Object.entries(store.records)) {
    if (!isPendingExpired(record)) continue;
    const restored = resolveEffectiveRecord(record);
    if (!restored) {
      delete store.records[key];
      changed = true;
    } else if (restored !== record) {
      store.records[key] = restored;
      changed = true;
    }
  }
  if (changed) await writeStorage(store);
}
