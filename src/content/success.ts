import { originFromUrl, siteKeyFromUrl } from '~/lib/domain';
import { sendMessage } from '~/lib/messages';

/**
 * Conservative success signals only:
 * - Login-looking path gone after navigation within the same origin
 * - Document title / body gains common "signed in" markers without reading storage
 */
const LOGIN_PATH_RE = /\/(login|signin|sign-in|auth|authenticate|session\/new)(\/|$)/i;

const SUCCESS_MARKERS = [
  '[data-testid*="avatar" i]',
  '[aria-label*="account menu" i]',
  '[aria-label*="user menu" i]',
  'button[aria-label*="sign out" i]',
  'a[href*="logout" i]',
  'a[href*="signout" i]',
  'a[href*="sign-out" i]',
];

let lastLoginPath: string | null = null;
let watching = false;

function looksLikeLoginPath(pathname: string): boolean {
  return LOGIN_PATH_RE.test(pathname);
}

function hasSignedInMarker(): boolean {
  return SUCCESS_MARKERS.some((sel) => document.querySelector(sel));
}

export function noteLoginContext(): void {
  if (looksLikeLoginPath(location.pathname)) {
    lastLoginPath = location.pathname;
  }
}

export function attachSuccessObserver(): void {
  if (watching) return;
  watching = true;
  noteLoginContext();

  const maybeConfirm = () => {
    if (!lastLoginPath) return;
    if (looksLikeLoginPath(location.pathname)) return;
    // Left the login path on same origin — only confirm if a signed-in marker exists.
    if (!hasSignedInMarker()) return;

    const url = location.href;
    void sendMessage({
      type: 'SUCCESS_SIGNAL',
      payload: {
        origin: originFromUrl(url),
        siteKey: siteKeyFromUrl(url),
      },
    }).catch(() => {});
    lastLoginPath = null;
  };

  // SPA route changes
  const wrap = (fn: typeof history.pushState) =>
    function (this: History, ...args: Parameters<typeof history.pushState>) {
      const result = fn.apply(this, args);
      queueMicrotask(() => {
        noteLoginContext();
        maybeConfirm();
      });
      return result;
    };

  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  window.addEventListener('popstate', () => {
    noteLoginContext();
    maybeConfirm();
  });

  // Initial check after a short delay (redirect landing)
  window.setTimeout(maybeConfirm, 1200);
}
