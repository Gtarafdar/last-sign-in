import { attachClickRecorder } from '~/content/record-click';
import { attachSuccessObserver } from '~/content/success';
import {
  findLoginSurfaceElement,
  findPageBadgeTarget,
  isLoginSurfaceOpen,
} from '~/content/scan';
import { detectNativeLastUsed } from '~/content/native-last-used';
import {
  badgeMutating,
  removePageBadge,
  showPageBadge,
  showSurfaceBadge,
} from '~/content/badge';
import { dismissToast, showTrackFailToast } from '~/content/toast';
import { originFromUrl } from '~/lib/domain';
import { sendMessage, type SiteState } from '~/lib/messages';
import type { AuthMethodId, Settings } from '~/lib/types';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  registration: 'manifest',
  runAt: 'document_idle',
  main() {
    void boot();
  },
});

const PAGE_BADGE_METHODS = new Set<AuthMethodId>([
  'google',
  'github',
  'microsoft',
  'apple',
  'facebook',
  'linkedin',
  'x',
  'sso',
  'passkey',
  'email',
  'password',
]);

let lastNative = false;
let lastSkipReason: string | null = null;

/**
 * Toast only when a real login screen is open AND auto-tracking failed —
 * same situations as the popup notice (never on general browsing pages).
 */
function showLoginTrackFailToast(reason: string): void {
  const isFail =
    reason.startsWith('no-target') ||
    reason === 'show-failed' ||
    reason === 'surface-fallback' ||
    reason === 'button-pin-failed-surface-ok' ||
    reason.startsWith('error:');
  if (!isFail) return;
  if (!isLoginSurfaceOpen()) return;

  const isSoftFallback =
    reason === 'surface-fallback' || reason === 'button-pin-failed-surface-ok';

  showTrackFailToast({
    key: reason,
    title: isSoftFallback
      ? 'Auto-detect had trouble on this site'
      : 'Couldn’t auto-track this login screen',
    body: isSoftFallback
      ? 'Sorry — we couldn’t pin to the exact login button. A reminder is on the login panel. For best accuracy, save the method manually in the Last Sign-in popup.'
      : 'Sorry for the inconvenience — this site’s login UI is hard to read automatically. Open the Last Sign-in extension and save your method manually. We’ll still remind you next time. We never store passwords or emails.',
  });
}

async function boot(): Promise<void> {
  document.querySelectorAll('[data-last-sign-in-wrap]').forEach((el) => {
    const child = el.firstElementChild;
    if (child && el.childElementCount === 1) el.replaceWith(child);
    else el.remove();
  });
  document.getElementById('last-sign-in-badge-host')?.remove();
  dismissToast();

  attachClickRecorder();
  attachSuccessObserver();
  await refreshBadge();

  let scanTimer = 0;
  const schedule = () => {
    if (badgeMutating) return;
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      if (badgeMutating) return;
      void refreshBadge();
    }, 500);
  };

  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) => {
      const nodes = [
        ...Array.from(m.addedNodes),
        ...Array.from(m.removedNodes),
        m.target,
      ];
      return nodes.some((n) => {
        if (!(n instanceof Element)) return n instanceof Text;
        return (
          !n.closest?.('[data-last-sign-in]') &&
          n.id !== 'last-sign-in-badge-host' &&
          n.id !== 'last-sign-in-toast'
        );
      });
    });
    if (relevant) schedule();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      observer.disconnect();
    } else {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      void refreshBadge();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'REFRESH_BADGE') {
      void refreshBadge().then(() => {
        sendResponse?.({
          ok: true,
          data: {
            nativeLastUsed: lastNative,
            showingOurs: Boolean(
              document.getElementById('last-sign-in-badge-host'),
            ),
            skipReason: lastSkipReason,
            loginSurface: isLoginSurfaceOpen(),
          },
        });
      });
      return true;
    }
    if (message?.type === 'GET_PAGE_BADGE_STATUS') {
      sendResponse({
        ok: true,
        data: {
          nativeLastUsed: lastNative,
          showingOurs: Boolean(
            document.getElementById('last-sign-in-badge-host'),
          ),
          skipReason: lastSkipReason,
          loginSurface: isLoginSurfaceOpen(),
        },
      });
      return true;
    }
  });
}

async function refreshBadge(): Promise<void> {
  lastSkipReason = null;
  try {
    const settings = (await sendMessage({ type: 'GET_SETTINGS' })) as Settings;
    if (!settings.showPageBadge) {
      lastNative = false;
      lastSkipReason = 'settings-off';
      removePageBadge();
      return;
    }

    const state = (await sendMessage({
      type: 'GET_CURRENT_SITE_STATE',
      payload: { url: location.href },
    })) as SiteState;

    const loginOpen = isLoginSurfaceOpen();

    // General browsing — never toast
    if (!loginOpen) {
      lastSkipReason = state.record ? 'no-login-surface' : 'no-record';
      removePageBadge();
      dismissToast();
      return;
    }

    if (!state.record || state.record.disabled || state.record.pageBadgeHidden) {
      lastNative = detectNativeLastUsed();
      lastSkipReason = !state.record
        ? 'no-record'
        : state.record.disabled
          ? 'disabled'
          : 'badge-hidden';
      removePageBadge();

      // Login UI open, nothing saved yet → toast once (same spirit as popup)
      if (!state.record && state.hasHostPermission) {
        showTrackFailToast({
          key: 'no-record-on-login',
          title: 'No sign-in method saved yet',
          body: 'If we miss your click, open Last Sign-in and save the method manually. We’ll remind you next time — never passwords or emails.',
        });
      }
      return;
    }

    if (state.origin !== originFromUrl(location.href)) {
      lastSkipReason = 'origin-mismatch';
      removePageBadge();
      return;
    }

    lastNative = detectNativeLastUsed();
    if (lastNative) {
      lastSkipReason = 'native-last-used';
      removePageBadge();
      dismissToast();
      return;
    }

    if (!PAGE_BADGE_METHODS.has(state.record.methodId)) {
      lastSkipReason = 'method-not-badgeable';
      removePageBadge();
      showLoginTrackFailToast(lastSkipReason);
      return;
    }

    const match = findPageBadgeTarget(state.record.methodId);
    if (match) {
      const ok = showPageBadge(
        match.element,
        state.record.confidence,
        state.record.methodLabel,
      );
      if (ok) {
        dismissToast();
        return;
      }
    }

    const surface = findLoginSurfaceElement();
    if (surface) {
      const ok = showSurfaceBadge(
        surface,
        state.record.confidence,
        state.record.methodLabel,
      );
      if (ok) {
        lastSkipReason = match
          ? 'button-pin-failed-surface-ok'
          : 'surface-fallback';
        showLoginTrackFailToast(lastSkipReason);
        return;
      }
    }

    lastSkipReason = `no-target:${state.record.methodId}`;
    removePageBadge();
    showLoginTrackFailToast(lastSkipReason);
  } catch (err) {
    lastSkipReason = `error:${err instanceof Error ? err.message : 'unknown'}`;
    if (isLoginSurfaceOpen()) {
      showLoginTrackFailToast(lastSkipReason);
    }
  }
}
