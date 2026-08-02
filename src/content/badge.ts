import type { Confidence } from '~/lib/types';

const BADGE_HOST_ATTR = 'data-last-sign-in';
const BADGE_HOST_ID = 'last-sign-in-badge-host';

let activeHost: HTMLElement | null = null;
let activeTarget: Element | null = null;
let activeKey: string | null = null;
let placeMode: 'corner' | 'surface' = 'corner';
let repositionRaf = 0;
let listenersAttached = false;

/** True while we mutate the DOM — MutationObserver must ignore these. */
export let badgeMutating = false;

function withMutationGuard(fn: () => void): void {
  badgeMutating = true;
  try {
    fn();
  } finally {
    queueMicrotask(() => {
      badgeMutating = false;
    });
  }
}

function labelFor(
  confidence: Confidence,
  methodLabel?: string,
  includeMethod = false,
): string {
  const base = confidence === 'pending' ? 'Last selected' : 'Last used';
  if (includeMethod && methodLabel?.trim()) {
    return `${base} · ${methodLabel.trim()}`;
  }
  return base;
}

function colorsFor(confidence: Confidence): {
  bg: string;
  fg: string;
  border: string;
} {
  if (confidence === 'pending') {
    return { bg: '#FFF0BF', fg: '#4A3614', border: '#E8C65F' };
  }
  return { bg: '#F4F7F5', fg: '#1A2E28', border: '#A8B8B0' };
}

function ensureListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener('scroll', onReposition, true);
  window.addEventListener('resize', onReposition);
}

function onReposition(): void {
  if (repositionRaf) return;
  repositionRaf = requestAnimationFrame(() => {
    repositionRaf = 0;
    if (!activeHost || !activeTarget) return;
    if (!document.contains(activeTarget)) {
      removePageBadge();
      return;
    }
    if (placeMode === 'surface') placeOnSurface(activeTarget, activeHost);
    else placeOnCorner(activeTarget, activeHost);
  });
}

/** Supabase/Lovable: hang on the control's top-right corner. */
function placeOnCorner(target: Element, host: HTMLElement): void {
  const rect = target.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) {
    host.style.visibility = 'hidden';
    return;
  }
  host.style.visibility = 'visible';
  host.style.position = 'fixed';
  host.style.top = `${Math.max(4, rect.top - 8)}px`;
  host.style.left = `${Math.min(window.innerWidth - 8, rect.right - 6)}px`;
  host.style.right = 'auto';
  host.style.bottom = 'auto';
  host.style.transform = 'translate(-100%, -50%)';
  host.style.zIndex = '2147483646';
  host.style.pointerEvents = 'none';
  host.style.margin = '0';
  host.style.padding = '0';
}

/** Fallback: top-right of the login modal / auth surface. */
function placeOnSurface(target: Element, host: HTMLElement): void {
  const rect = target.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) {
    host.style.visibility = 'hidden';
    return;
  }
  host.style.visibility = 'visible';
  host.style.position = 'fixed';
  host.style.top = `${Math.max(8, rect.top + 10)}px`;
  host.style.left = `${Math.min(window.innerWidth - 12, rect.right - 12)}px`;
  host.style.right = 'auto';
  host.style.bottom = 'auto';
  host.style.transform = 'translate(-100%, 0)';
  host.style.zIndex = '2147483646';
  host.style.pointerEvents = 'none';
  host.style.margin = '0';
  host.style.padding = '0';
}

function setPillText(
  host: HTMLElement,
  confidence: Confidence,
  methodLabel?: string,
  includeMethod = false,
): void {
  const existing = host.shadowRoot;
  if (existing) {
    const pill = existing.querySelector('.pill');
    if (pill) {
      const text = labelFor(confidence, methodLabel, includeMethod);
      pill.textContent = text;
      (pill as HTMLElement).title = text;
      return;
    }
  }

  const shadow = host.attachShadow({ mode: 'open' });
  const colors = colorsFor(confidence);
  const style = document.createElement('style');
  style.textContent = `
    .pill {
      display: inline-flex;
      align-items: center;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid ${colors.border};
      background: ${colors.bg};
      color: ${colors.fg};
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      pointer-events: none;
      user-select: none;
    }
  `;
  const pill = document.createElement('span');
  pill.className = 'pill';
  const text = labelFor(confidence, methodLabel, includeMethod);
  pill.textContent = text;
  pill.title = text;
  shadow.append(style, pill);
}

function mountBadge(
  target: Element,
  confidence: Confidence,
  methodLabel: string | undefined,
  mode: 'corner' | 'surface',
  includeMethod: boolean,
): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const key = `${mode}|${confidence}|${methodLabel ?? ''}|${target.tagName}`;
  if (
    activeHost &&
    activeTarget === target &&
    activeKey === key &&
    document.contains(activeHost)
  ) {
    placeMode = mode;
    if (mode === 'surface') placeOnSurface(target, activeHost);
    else placeOnCorner(target, activeHost);
    return true;
  }

  withMutationGuard(() => {
    activeHost?.remove();
    document.getElementById(BADGE_HOST_ID)?.remove();

    const host = document.createElement('div');
    host.id = BADGE_HOST_ID;
    host.setAttribute(BADGE_HOST_ATTR, 'badge');
    host.setAttribute('aria-hidden', 'true');
    setPillText(host, confidence, methodLabel, includeMethod);
    placeMode = mode;
    if (mode === 'surface') placeOnSurface(target, host);
    else placeOnCorner(target, host);
    document.documentElement.appendChild(host);

    activeHost = host;
    activeTarget = target;
    activeKey = key;
  });

  ensureListeners();
  return Boolean(document.getElementById(BADGE_HOST_ID));
}

export function removePageBadge(): void {
  withMutationGuard(() => {
    if (repositionRaf) {
      cancelAnimationFrame(repositionRaf);
      repositionRaf = 0;
    }
    activeHost?.remove();
    document.getElementById(BADGE_HOST_ID)?.remove();
    activeHost = null;
    activeTarget = null;
    activeKey = null;
  });
}

export function isBadgeShowingFor(key: string): boolean {
  return activeKey === key && activeHost != null && document.contains(activeHost);
}

/** Pin chip to a specific login button (preferred). */
export function showPageBadge(
  target: Element,
  confidence: Confidence,
  methodLabel?: string,
): boolean {
  return mountBadge(target, confidence, methodLabel, 'corner', false);
}

/**
 * Fallback when the exact provider control can't be found (icon-only OAuth).
 * Places "Last used · Google" on the login modal's top-right.
 */
export function showSurfaceBadge(
  surface: Element,
  confidence: Confidence,
  methodLabel?: string,
): boolean {
  return mountBadge(surface, confidence, methodLabel, 'surface', true);
}
