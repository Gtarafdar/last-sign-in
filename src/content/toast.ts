const TOAST_ID = 'last-sign-in-toast';
const TOAST_ATTR = 'data-last-sign-in';

let hideTimer = 0;
let lastToastKey = '';
let lastToastAt = 0;

export function dismissToast(): void {
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = 0;
  }
  document.getElementById(TOAST_ID)?.remove();
}

/**
 * Soft failure notice on the page (not a success toast).
 * Deduped so MutationObserver rescans don't spam.
 */
export function showTrackFailToast(options?: {
  key?: string;
  title?: string;
  body?: string;
  durationMs?: number;
}): void {
  const key = options?.key ?? 'auto-fail';
  const now = Date.now();
  // Same notice at most once per 45s on this page
  if (key === lastToastKey && now - lastToastAt < 45_000) {
    return;
  }
  lastToastKey = key;
  lastToastAt = now;

  dismissToast();

  const host = document.createElement('div');
  host.id = TOAST_ID;
  host.setAttribute(TOAST_ATTR, 'toast');
  Object.assign(host.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    zIndex: '2147483647',
    maxWidth: 'min(360px, calc(100vw - 24px))',
    pointerEvents: 'auto',
    margin: '0',
    padding: '0',
  } satisfies Partial<CSSStyleDeclaration>);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .toast {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #E8C65F;
      background: #FFF8E8;
      color: #1A2E28;
      box-shadow: 0 10px 30px rgba(21, 37, 33, 0.18);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      animation: slide-up 160ms ease-out;
    }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast { animation: none; }
    }
    .icon {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      border-radius: 50%;
      background: #FFC857;
      color: #4A3614;
      font-size: 12px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    }
    .copy { flex: 1; min-width: 0; }
    .title {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 700;
      color: #4A3614;
    }
    .body {
      margin: 0;
      font-size: 12px;
      line-height: 1.45;
      color: #3d4f48;
    }
    .close {
      flex: 0 0 auto;
      border: 0;
      background: transparent;
      color: #61706a;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;
    }
    .close:hover { color: #152521; }
  `;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = '!';
  icon.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('div');
  copy.className = 'copy';
  const title = document.createElement('p');
  title.className = 'title';
  title.textContent =
    options?.title ?? 'Couldn’t auto-track this login screen';
  const body = document.createElement('p');
  body.className = 'body';
  body.textContent =
    options?.body ??
    'Sorry — this site’s login buttons are hard to read automatically. Open the Last Sign-in extension and save your method manually. We’ll still remind you next time.';
  copy.append(title, body);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.setAttribute('aria-label', 'Dismiss notice');
  close.textContent = '×';
  close.addEventListener('click', () => dismissToast());

  toast.append(icon, copy, close);
  shadow.append(style, toast);
  document.documentElement.appendChild(host);

  const duration = options?.durationMs ?? 8000;
  hideTimer = window.setTimeout(() => dismissToast(), duration);
}
