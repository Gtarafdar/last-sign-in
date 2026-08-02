export type AuthMethodId =
  | 'google'
  | 'github'
  | 'microsoft'
  | 'apple'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'sso'
  | 'email'
  | 'password'
  | 'passkey'
  | 'custom';

export type Confidence = 'pending' | 'confirmed' | 'manual';
export type SiteScope = 'origin' | 'host';

export interface SiteRecord {
  id: string;
  origin: string;
  siteKey: string;
  scope: SiteScope;
  methodId: AuthMethodId;
  methodLabel: string;
  profileLabel?: string;
  confidence: Confidence;
  lastSelectedAt: string;
  lastConfirmedAt?: string;
  pendingExpiresAt?: string;
  pageBadgeHidden: boolean;
  disabled: boolean;
  /** Kept temporarily when a new pending selection replaces a confirmed one. */
  previousConfirmed?: Pick<
    SiteRecord,
    'methodId' | 'methodLabel' | 'profileLabel' | 'lastConfirmedAt'
  >;
}

export interface Settings {
  showPageBadge: boolean;
  showToolbarBadge: boolean;
  pendingTtlDays: 7 | 30 | 90 | null;
  defaultScope: SiteScope;
  theme: 'system' | 'light' | 'dark';
  storageMode: 'local';
}

export interface StorageEnvelope {
  schemaVersion: 1;
  records: Record<string, SiteRecord>;
  settings: Settings;
  /** Origins the user has enabled for automatic content-script injection. */
  enabledOrigins: string[];
}

export interface MethodSelection {
  origin: string;
  siteKey: string;
  methodId: AuthMethodId;
  methodLabel: string;
  selectedAt: string;
}

export interface CandidateSummary {
  methodId: AuthMethodId;
  methodLabel: string;
  score: number;
  signalTypes: string[];
}

export interface SiteState {
  origin: string;
  siteKey: string;
  record: SiteRecord | null;
  enabled: boolean;
  hasHostPermission: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showPageBadge: true,
  showToolbarBadge: true,
  pendingTtlDays: 30,
  defaultScope: 'origin',
  theme: 'system',
  storageMode: 'local',
};

export const EMPTY_STORAGE: StorageEnvelope = {
  schemaVersion: 1,
  records: {},
  settings: DEFAULT_SETTINGS,
  enabledOrigins: [],
};
