import { AUTH_METHODS } from '~/lib/methods';
import {
  CANDIDATE_THRESHOLD,
  containsPhrase,
  normalizeText,
  scoreCandidateText,
} from '~/lib/score';
import type { AuthMethodId } from '~/lib/types';

export interface ScoredCandidate {
  element: Element;
  methodId: AuthMethodId;
  methodLabel: string;
  score: number;
  signalTypes: string[];
  accessibleName: string;
}

const CANDIDATE_SELECTOR = [
  'button',
  'a[href]',
  'input[type="submit"]',
  'input[type="button"]',
  '[role="button"]',
  '[data-provider]',
  '[data-auth-provider]',
].join(',');

const PROVIDER_ATTR_RE =
  /\b(google|github|microsoft|apple|facebook|fb|linkedin|twitter|(?<![a-z])x(?![a-z])|sso|okta|auth0|oauth)\b/i;

function isCredentialField(el: Element): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || '').toLowerCase();
  return (
    type === 'password' ||
    type === 'email' ||
    type === 'tel' ||
    /password|email|username|otp|phone/i.test(el.name || '') ||
    /password|email|username|otp|phone/i.test(el.id || '')
  );
}

export function getAccessibleName(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria?.trim()) return aria.trim();

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }

  const title = el.getAttribute('title');
  if (title?.trim()) return title.trim();

  if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) {
    if (el.value?.trim()) return el.value.trim();
  }

  const alt = el.querySelector('img[alt]')?.getAttribute('alt');
  if (alt?.trim()) return alt.trim();

  const svgAria = el.querySelector('svg[aria-label]')?.getAttribute('aria-label');
  if (svgAria?.trim()) return svgAria.trim();

  const svgTitle = el.querySelector('svg title')?.textContent;
  if (svgTitle?.trim()) return svgTitle.trim();

  const sr = el.querySelector(
    '.sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]',
  );
  if (sr?.textContent?.trim()) return sr.textContent.trim();

  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function collectProviderHints(el: Element): string {
  const bits: string[] = [];
  const push = (v: string | null | undefined) => {
    if (v?.trim()) bits.push(v.trim());
  };

  let node: Element | null = el;
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    push(node.getAttribute('aria-label'));
    push(node.getAttribute('title'));
    push(node.getAttribute('data-provider'));
    push(node.getAttribute('data-auth-provider'));
    push(node.getAttribute('data-oauth'));
    push(node.getAttribute('data-testid'));
    push(node.getAttribute('data-cy'));
    push(node.getAttribute('data-qa'));
    push(node.getAttribute('name'));
    push(node.id);
    push(typeof node.className === 'string' ? node.className : '');

    for (const attr of Array.from(node.attributes)) {
      if (/^data-/i.test(attr.name) && PROVIDER_ATTR_RE.test(attr.value)) {
        push(attr.value);
      }
    }
  }

  const img = el.querySelector('img[alt], img[src]');
  if (img) {
    push(img.getAttribute('alt'));
    push(img.getAttribute('src'));
  }

  const svg = el.querySelector('svg');
  if (svg) {
    push(svg.getAttribute('aria-label'));
    push(svg.querySelector('title')?.textContent ?? '');
    push(
      svg.querySelector('use')?.getAttribute('href') ??
        svg.querySelector('use')?.getAttribute('xlink:href'),
    );
  }

  if (el instanceof HTMLAnchorElement) push(el.getAttribute('href'));
  push(el.getAttribute('formaction'));

  return bits.join(' ');
}

function getHrefHostname(el: Element): string | undefined {
  const raw =
    (el instanceof HTMLAnchorElement && el.href) ||
    el.getAttribute('formaction') ||
    el.getAttribute('href') ||
    '';
  if (!raw) return undefined;
  try {
    return new URL(raw, location.href).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function extractHostFromHints(hints: string): string | undefined {
  const m = hints.match(
    /https?:\/\/([^/\s"'?]+)|(accounts\.google\.com|github\.com|appleid\.apple\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|login\.microsoftonline\.com)/i,
  );
  if (!m) return undefined;
  return (m[1] || m[2] || '').toLowerCase();
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function scoreElement(el: Element): ScoredCandidate | null {
  const accessibleName = getAccessibleName(el);
  const hints = collectProviderHints(el);
  const combined = [accessibleName, hints].filter(Boolean).join(' ');
  if (!combined.trim()) return null;

  const hrefHost = getHrefHostname(el) ?? extractHostFromHints(hints);
  const scored = scoreCandidateText(combined, hrefHost);
  if (!scored || scored.score < CANDIDATE_THRESHOLD) return null;

  return {
    element: el,
    methodId: scored.methodId,
    methodLabel: scored.methodLabel,
    score: scored.score,
    signalTypes: scored.signalTypes,
    accessibleName: normalizeText(accessibleName || hints),
  };
}

export function collectCandidates(root: ParentNode = document): ScoredCandidate[] {
  const nodes = root.querySelectorAll?.(CANDIDATE_SELECTOR);
  if (!nodes) return [];

  const results: ScoredCandidate[] = [];
  const seen = new Set<Element>();

  for (const el of Array.from(nodes)) {
    if (seen.has(el)) continue;
    seen.add(el);
    if (isCredentialField(el)) continue;
    if (el.closest('[data-last-sign-in]')) continue;
    if (!isVisible(el)) continue;

    const scored = scoreElement(el);
    if (!scored) continue;
    results.push(scored);
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * True only when a real sign-in / sign-up auth UI is visible.
 * Header "Sign in" alone or unrelated dialogs must NOT count
 * (avoids toasts on general Product Hunt product pages).
 */
export function isLoginSurfaceOpen(root: ParentNode = document): boolean {
  // Password form on screen
  const password = document.querySelector('input[type="password"]');
  if (password && isVisible(password) && !isInNavChrome(password)) {
    return true;
  }

  // Explicit provider login buttons: "Sign in with …" / "Continue with …"
  // (not bare "Sign in" in the header)
  const nodes = root.querySelectorAll?.(
    'button, a[href], [role="button"]',
  );
  if (!nodes) return false;

  let providerLoginButtons = 0;
  for (const el of Array.from(nodes)) {
    if (!isVisible(el) || isInNavChrome(el)) continue;
    const label = `${getAccessibleName(el)} ${el.textContent ?? ''}`.trim();
    if (
      /\b(sign[\s-]?in with|sign[\s-]?up with|continue with|log[\s-]?in with)\b/i.test(
        label,
      )
    ) {
      providerLoginButtons += 1;
      if (providerLoginButtons >= 1) return true;
    }
  }

  // Dialog/modal only if it contains provider login controls or a password field
  const dialogs = document.querySelectorAll(
    '[role="dialog"], [aria-modal="true"], dialog',
  );
  for (const dialog of Array.from(dialogs)) {
    if (!(dialog instanceof HTMLElement) || !isVisible(dialog)) continue;
    if (dialog.querySelector('input[type="password"]')) return true;
    const inner = dialog.querySelectorAll('button, a, [role="button"]');
    for (const el of Array.from(inner)) {
      const label = `${getAccessibleName(el)} ${el.textContent ?? ''}`;
      if (
        /\b(sign[\s-]?in with|sign[\s-]?up with|continue with|log[\s-]?in with)\b/i.test(
          label,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find the visible login/signup modal or auth card surface.
 * Used when we can't pin to a specific provider button.
 */
export function findLoginSurfaceElement(
  root: ParentNode = document,
): HTMLElement | null {
  const dialog = document.querySelector(
    '[role="dialog"], [aria-modal="true"], dialog',
  );
  if (dialog instanceof HTMLElement && isVisible(dialog)) return dialog;

  // Card containing "Sign in with …" buttons (Product Hunt style)
  const nodes = root.querySelectorAll?.('button, a, [role="button"]');
  if (!nodes) return null;

  for (const el of Array.from(nodes)) {
    if (!isVisible(el)) continue;
    const text = `${getAccessibleName(el)} ${el.textContent ?? ''}`;
    if (!/\bsign[\s-]?in with\b|\bcontinue with\b|\bsign[\s-]?up with\b/i.test(text)) {
      continue;
    }
    // Walk up to a reasonably sized card/modal panel
    let node: HTMLElement | null = el.parentElement;
    for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
      const r = node.getBoundingClientRect();
      if (r.width >= 280 && r.width <= 640 && r.height >= 200 && r.height <= 900) {
        return node;
      }
    }
    return el.parentElement;
  }
  return null;
}

export function findBestMatchForMethod(
  methodId: AuthMethodId,
  root: ParentNode = document,
): ScoredCandidate | null {
  const candidates = collectCandidates(root).filter((c) => c.methodId === methodId);
  if (candidates.length === 0) return null;
  const visible = candidates.filter((c) => isVisible(c.element));
  const pool = visible.length > 0 ? visible : candidates;
  return pool[0] ?? null;
}

function isInNavChrome(el: Element): boolean {
  // Allow auth controls inside dialogs even if nested under header markup
  if (el.closest('[role="dialog"], [aria-modal="true"], dialog')) return false;
  return Boolean(el.closest('header, nav, [role="navigation"], [role="banner"]'));
}

export function findPasswordFormSubmit(
  root: ParentNode = document,
): ScoredCandidate | null {
  const passwords = Array.from(
    root.querySelectorAll?.('input[type="password"]') ?? [],
  ).filter((el) => isVisible(el) && !isInNavChrome(el));

  for (const pw of passwords) {
    const form =
      pw.closest('form') ??
      pw.closest('[role="dialog"], [aria-modal="true"], dialog');
    if (!form) continue;

    const controls = Array.from(
      form.querySelectorAll(
        'button, input[type="submit"], input[type="button"], [role="button"]',
      ),
    );

    const ranked: { el: Element; score: number }[] = [];
    for (const el of controls) {
      if (!isVisible(el) || isCredentialField(el) || isInNavChrome(el)) continue;
      const name = normalizeText(getAccessibleName(el));
      if (!name) continue;
      if (/\b(forgot|lost|reset|sign[\s-]?up|register|create)\b/i.test(name)) {
        continue;
      }

      let score = 0;
      if (
        el instanceof HTMLButtonElement &&
        (el.type === 'submit' || !el.getAttribute('type'))
      ) {
        score += 6;
      }
      if (el instanceof HTMLInputElement && el.type === 'submit') score += 8;
      if (/\b(log[\s-]?in|sign[\s-]?in|login|submit|continue)\b/i.test(name)) {
        score += 8;
      }
      if (score < 8) continue;
      ranked.push({ el, score });
    }

    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best) continue;

    return {
      element: best.el,
      methodId: 'password',
      methodLabel: 'Password',
      score: best.score,
      signalTypes: ['exact-label', 'form-submit'],
      accessibleName: normalizeText(getAccessibleName(best.el)),
    };
  }

  return null;
}

/**
 * Last-resort: find a visible control whose hints mention this provider.
 * Used when icon-only buttons fail the full scorer but the user set the method.
 */
function findProviderControlFallback(
  methodId: AuthMethodId,
  root: ParentNode = document,
): ScoredCandidate | null {
  const method = AUTH_METHODS.find((m) => m.id === methodId);
  if (!method || methodId === 'password' || methodId === 'custom') return null;

  const selector = [
    'button',
    'a',
    '[role="button"]',
    '[tabindex="0"]',
    '[data-provider]',
    '[data-testid]',
  ].join(',');

  const nodes = root.querySelectorAll?.(selector);
  if (!nodes) return null;

  const label = method.label.toLowerCase();
  let best: ScoredCandidate | null = null;

  for (const el of Array.from(nodes)) {
    if (!isVisible(el) || isCredentialField(el) || isInNavChrome(el)) continue;
    if (el.closest('[data-last-sign-in]')) continue;

    const blob = normalizeText(
      `${getAccessibleName(el)} ${collectProviderHints(el)} ${el.textContent ?? ''}`,
    );
    if (!blob) continue;

    const hit = method.phrases.some((p) => containsPhrase(blob, p));
    if (!hit && !blob.includes(label)) continue;

    const rect = el.getBoundingClientRect();
    // Prefer the actual clickable control (icon buttons are often ~32–48px)
    const score = rect.width * rect.height;
    const candidate: ScoredCandidate = {
      element: el,
      methodId,
      methodLabel: method.label,
      score: 50 + score / 1000,
      signalTypes: ['provider-fallback'],
      accessibleName: blob.slice(0, 80),
    };
    if (!best || candidate.score > best.score) best = candidate;
  }

  return best;
}

export function findPageBadgeTarget(
  methodId: AuthMethodId,
  root: ParentNode = document,
): ScoredCandidate | null {
  if (methodId === 'password' || methodId === 'email') {
    const formSubmit = findPasswordFormSubmit(root);
    if (formSubmit) return formSubmit;
    if (methodId === 'email') {
      const emailBtn = findBestMatchForMethod('email', root);
      if (
        emailBtn &&
        !isInNavChrome(emailBtn.element) &&
        (emailBtn.signalTypes.includes('exact-label') ||
          emailBtn.signalTypes.includes('provider-name'))
      ) {
        return emailBtn;
      }
    }
    return null;
  }

  const match = findBestMatchForMethod(methodId, root);
  if (match && !isInNavChrome(match.element)) {
    const strong =
      match.signalTypes.includes('exact-label') ||
      match.signalTypes.includes('provider-name') ||
      match.signalTypes.includes('oauth-host');
    if (strong) return match;
  }

  return findProviderControlFallback(methodId, root);
}

export function resolveCandidateFromEventPath(
  path: EventTarget[],
): ScoredCandidate | null {
  const seen = new Set<Element>();
  const scored: ScoredCandidate[] = [];

  for (const target of path) {
    if (!(target instanceof Element)) continue;
    const interactive = target.closest(CANDIDATE_SELECTOR);
    if (!interactive || seen.has(interactive)) continue;
    seen.add(interactive);
    if (isCredentialField(interactive)) continue;
    if (interactive.closest('[data-last-sign-in]')) continue;

    const result = scoreElement(interactive);
    if (!result) continue;

    if (result.methodId === 'password') {
      const form = interactive.closest(
        'form, [role="dialog"], [aria-modal="true"]',
      );
      const hasPassword = form?.querySelector('input[type="password"]');
      if (!hasPassword) continue;
    }

    scored.push(result);
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  const bestProvider = scored.find((c) => c.methodId !== 'password');
  const bestOverall = scored[0]!;

  if (bestProvider && bestOverall.methodId === 'password') {
    return bestProvider;
  }

  return bestOverall;
}

export { CANDIDATE_SELECTOR };
