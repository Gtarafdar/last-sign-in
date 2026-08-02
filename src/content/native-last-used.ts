/**
 * Detect when a site already shows its own "Last used" UI (Lovable, Supabase, etc.).
 * If true, we suppress our in-page badge and leave the site's UX alone.
 */

const NATIVE_LAST_USED_RE =
  /\blast\s*used\b|\blast\s*sign[-\s]?in\b|\bpreviously\s*used\b|\brecently\s*used\b|\bzuletzt\s*verwendet\b|\bderni[eè]re?\s*utilisation\b/i;

const AUTH_SURFACE_RE =
  /\b(sign[\s-]?in|log[\s-]?in|continue with|oauth|sso|passkey|github|google|microsoft|apple)\b/i;

const CANDIDATE_SELECTOR = [
  'button',
  'a[href]',
  'input[type="submit"]',
  'input[type="button"]',
  '[role="button"]',
].join(',');

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function textOf(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function isOurBadge(el: Element): boolean {
  return Boolean(el.closest('[data-last-sign-in]'));
}

/** True if element looks like a small chip/pill label. */
function looksLikeChip(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return false;
  if (rect.width > 160 || rect.height > 36) return false;
  const text = textOf(el);
  if (!text || text.length > 24) return false;
  return NATIVE_LAST_USED_RE.test(text);
}

/**
 * Find auth-related interactive controls currently visible (login surface).
 */
function findAuthControls(root: ParentNode = document): Element[] {
  const nodes = root.querySelectorAll?.(CANDIDATE_SELECTOR);
  if (!nodes) return [];
  return Array.from(nodes).filter((el) => {
    if (!isVisible(el) || isOurBadge(el)) return false;
    const name = textOf(el) || el.getAttribute('aria-label') || '';
    return AUTH_SURFACE_RE.test(name);
  });
}

/**
 * A native last-used marker near an auth control (same form / dialog / cluster).
 */
export function detectNativeLastUsed(root: ParentNode = document): boolean {
  const authControls = findAuthControls(root);
  // No auth controls → nothing to defer to (don't scan whole page for false positives)
  if (authControls.length === 0) return false;

  for (const control of authControls) {
    const surface =
      control.closest('form, [role="dialog"], [aria-modal="true"], dialog') ??
      control.parentElement;
    if (!surface) continue;

    if (hasOverlappingChip(control, surface)) return true;

    // Chip as direct/near sibling of the control (Lovable/Supabase pattern)
    const parent = control.parentElement;
    if (parent) {
      for (const child of Array.from(parent.children)) {
        if (child === control || isOurBadge(child) || !isVisible(child)) continue;
        if (looksLikeChip(child) && NATIVE_LAST_USED_RE.test(textOf(child))) {
          return true;
        }
      }
    }
  }

  return false;
}

function hasOverlappingChip(control: Element, surface: Element): boolean {
  const cRect = control.getBoundingClientRect();
  const topRight = {
    left: cRect.left + cRect.width * 0.55,
    right: cRect.right + 24,
    top: cRect.top - 16,
    bottom: cRect.top + cRect.height * 0.45,
  };

  const chips = surface.querySelectorAll('span, div, small, label');
  for (const el of Array.from(chips)) {
    if (isOurBadge(el) || !isVisible(el)) continue;
    const text = textOf(el);
    if (!NATIVE_LAST_USED_RE.test(text) || text.length > 24) continue;
    const r = el.getBoundingClientRect();
    const overlaps =
      r.left < topRight.right &&
      r.right > topRight.left &&
      r.top < topRight.bottom &&
      r.bottom > topRight.top;
    if (overlaps) return true;
  }
  return false;
}
