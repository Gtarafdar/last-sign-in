import type {
  AuthMethodId,
  Confidence,
  MethodSelection,
  Settings,
  SiteRecord,
  SiteScope,
  SiteState,
} from './types';

export type ExtensionMessage =
  | { type: 'METHOD_SELECTED'; payload: MethodSelection }
  | { type: 'SUCCESS_SIGNAL'; payload: { origin: string; siteKey: string } }
  | { type: 'GET_CURRENT_SITE_STATE'; payload: { url: string } }
  | {
      type: 'UPDATE_SITE_RECORD';
      payload: {
        origin: string;
        siteKey: string;
        methodId?: AuthMethodId;
        methodLabel?: string;
        profileLabel?: string | null;
        confidence?: Confidence;
        pageBadgeHidden?: boolean;
        disabled?: boolean;
        scope?: SiteScope;
      };
    }
  | { type: 'CONFIRM_SITE_RECORD'; payload: { origin: string; siteKey: string } }
  | { type: 'DELETE_SITE_RECORD'; payload: { origin: string; siteKey: string } }
  | { type: 'DELETE_ALL_RECORDS' }
  | { type: 'SET_ORIGIN_ENABLED'; payload: { origin: string; enabled: boolean } }
  | { type: 'REQUEST_HOST_PERMISSION'; payload: { origin: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'LIST_RECORDS' }
  | { type: 'ACTIVATE_TAB'; payload?: { grantHost?: boolean } }
  | { type: 'PING' };

export type ExtensionResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string';
}

export async function sendMessage<T = unknown>(
  message: ExtensionMessage,
): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as ExtensionResponse;
  if (!response?.ok) {
    throw new Error(response?.error ?? 'Message failed');
  }
  return response.data as T;
}

export type { SiteRecord, SiteState, Settings };
