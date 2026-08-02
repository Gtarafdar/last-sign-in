import {
  isExtensionMessage,
  type ExtensionMessage,
  type ExtensionResponse,
} from '~/lib/messages';
import {
  cleanupExpired,
  confirmRecord,
  deleteAllRecords,
  deleteSiteRecord,
  getSettings,
  getSiteState,
  listRecords,
  recordMethodSelection,
  setOriginEnabled,
  updateSettings,
  updateSiteRecord,
} from '~/lib/storage';
import { updateToolbarBadge } from '~/lib/badge-controller';

export default defineBackground(() => {
  void cleanupExpired();

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void chrome.tabs.create({
        url: chrome.runtime.getURL('/onboarding.html'),
      });
    }
  });

  // When the user clicks the action icon on a page without host permission,
  // activeTab grants ephemeral access — content script is registered via
  // optional hosts OR injected on demand from the popup.
  chrome.action.onClicked.addListener(() => {
    // Popup is set, so this won't fire when popup exists. Kept as fallback.
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void handleMessage(message, sender)
      .then((data) => {
        const response: ExtensionResponse = { ok: true, data };
        sendResponse(response);
      })
      .catch((err: unknown) => {
        const response: ExtensionResponse = {
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        sendResponse(response);
      });
    return true;
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    void refreshBadgeForTab(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      void refreshBadgeForTab(tabId);
    }
  });
});

async function refreshBadgeForTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !/^https?:/i.test(tab.url)) {
      await updateToolbarBadge(null, false);
      return;
    }
    const settings = await getSettings();
    const state = await getSiteState(tab.url);
    await updateToolbarBadge(state.record, settings.showToolbarBadge);
  } catch {
    // Tab may be gone
  }
}

async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (!isExtensionMessage(message)) {
    throw new Error('Invalid message');
  }

  // Validate sender for content-script-originated writes
  const senderOrigin = sender.tab?.url
    ? (() => {
        try {
          return new URL(sender.tab!.url!).origin;
        } catch {
          return null;
        }
      })()
    : null;

  switch (message.type) {
    case 'PING':
      return { pong: true };

    case 'GET_CURRENT_SITE_STATE': {
      const state = await getSiteState(message.payload.url);
      const settings = await getSettings();
      if (sender.tab?.id != null) {
        await updateToolbarBadge(state.record, settings.showToolbarBadge);
      }
      return state;
    }

    case 'METHOD_SELECTED': {
      if (senderOrigin && message.payload.origin !== senderOrigin) {
        throw new Error('Origin mismatch');
      }
      const record = await recordMethodSelection(message.payload);
      const settings = await getSettings();
      await updateToolbarBadge(record, settings.showToolbarBadge);
      return record;
    }

    case 'SUCCESS_SIGNAL': {
      if (senderOrigin && message.payload.origin !== senderOrigin) {
        throw new Error('Origin mismatch');
      }
      const record = await confirmRecord(
        message.payload.origin,
        message.payload.siteKey,
      );
      if (record) {
        const settings = await getSettings();
        await updateToolbarBadge(record, settings.showToolbarBadge);
      }
      return record;
    }

    case 'UPDATE_SITE_RECORD': {
      const record = await updateSiteRecord(message.payload);
      const settings = await getSettings();
      await updateToolbarBadge(record, settings.showToolbarBadge);
      // Notify content scripts on that origin to refresh badge
      await broadcastSiteUpdate(record.origin);
      return record;
    }

    case 'CONFIRM_SITE_RECORD': {
      const record = await confirmRecord(
        message.payload.origin,
        message.payload.siteKey,
      );
      if (record) {
        const settings = await getSettings();
        await updateToolbarBadge(record, settings.showToolbarBadge);
        await broadcastSiteUpdate(record.origin);
      }
      return record;
    }

    case 'DELETE_SITE_RECORD': {
      await deleteSiteRecord(message.payload.origin, message.payload.siteKey);
      await updateToolbarBadge(null, false);
      await broadcastSiteUpdate(message.payload.origin);
      return null;
    }

    case 'DELETE_ALL_RECORDS': {
      await deleteAllRecords();
      await updateToolbarBadge(null, false);
      return null;
    }

    case 'SET_ORIGIN_ENABLED': {
      await setOriginEnabled(message.payload.origin, message.payload.enabled);
      return null;
    }

    case 'REQUEST_HOST_PERMISSION': {
      const origin = message.payload.origin;
      const granted = await chrome.permissions.request({
        origins: [`${origin}/*`],
      });
      if (granted) {
        await setOriginEnabled(origin, true);
      }
      return { granted };
    }

    case 'GET_SETTINGS':
      return getSettings();

    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);

    case 'LIST_RECORDS':
      return listRecords();

    case 'ACTIVATE_TAB': {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
        throw new Error('No active http(s) tab');
      }
      const origin = new URL(tab.url).origin;
      if (message.payload?.grantHost) {
        const granted = await chrome.permissions.request({
          origins: [`${origin}/*`],
        });
        if (!granted) throw new Error('Host permission denied');
      }
      await setOriginEnabled(origin, true);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js'],
        });
      } catch {
        // Content script may already be present via host permission.
      }
      return getSiteState(tab.url);
    }

    default:
      throw new Error(
        `Unhandled message: ${(message as ExtensionMessage).type}`,
      );
  }
}

async function broadcastSiteUpdate(origin: string): Promise<void> {
  const tabs = await chrome.tabs.query({ url: `${origin}/*` });
  for (const tab of tabs) {
    if (tab.id == null) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_BADGE' });
    } catch {
      // Content script may not be loaded
    }
  }
}
