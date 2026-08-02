import { AUTH_METHODS, getMethodLabel } from './methods';
import type { AuthMethodId } from './types';

const AUTH_VERBS =
  /\b(sign[\s-]?in|log[\s-]?in|login|continue|connect|authenticate|authorize)\b/i;

const LOGOUT_RE =
  /\b(sign[\s-]?out|log[\s-]?out|logout|sign out of)\b/i;

const SIGNUP_ONLY_RE =
  /\b(create account|sign[\s-]?up|register|join with)\b/i;

export interface ScoreResult {
  methodId: AuthMethodId;
  methodLabel: string;
  score: number;
  signalTypes: string[];
}

/** Normalize for matching: lowercase, collapse whitespace, strip punctuation noise. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^\p{L}\p{N}\s.@+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if `phrase` appears as whole words inside `text`. */
export function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i');
  return re.test(text);
}

function hostMatches(hrefHost: string | undefined, known: string[]): boolean {
  if (!hrefHost) return false;
  const host = hrefHost.toLowerCase();
  return known.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Score a candidate from its accessible name and optional href hostname.
 * Does not touch the DOM or any form field values.
 */
export function scoreCandidateText(
  accessibleName: string,
  hrefHostname?: string,
): ScoreResult | null {
  const text = normalizeText(accessibleName);
  if (!text) return null;

  if (LOGOUT_RE.test(text)) return null;

  let best: ScoreResult | null = null;

  for (const method of AUTH_METHODS) {
    // Skip generic password method until we've ruled out social providers
    // (handled after the loop for form submit buttons).
    if (method.id === 'password') continue;

    let score = 0;
    const signalTypes: string[] = [];

    // Prefer longer / more specific phrase matches
    const phrases = [...method.phrases].sort((a, b) => b.length - a.length);
    for (const phrase of phrases) {
      if (!containsPhrase(text, phrase)) continue;
      if (phrase === method.label.toLowerCase() || phrase.split(' ').length === 1) {
        // Bare provider name
        score += 5;
        signalTypes.push('provider-name');
      } else {
        score += 8;
        signalTypes.push('exact-label');
      }
      break;
    }

    if (hostMatches(hrefHostname, method.hosts)) {
      score += 5;
      signalTypes.push('oauth-host');
    }

    if (AUTH_VERBS.test(text) && score > 0) {
      score += 3;
      signalTypes.push('auth-verb');
    }

    // Don't penalize real provider OAuth buttons that say "Sign up with Google"
    const hasProvider =
      signalTypes.includes('provider-name') ||
      signalTypes.includes('exact-label') ||
      signalTypes.includes('oauth-host');
    if (SIGNUP_ONLY_RE.test(text) && !AUTH_VERBS.test(text) && !hasProvider) {
      score -= 4;
      signalTypes.push('signup-penalty');
    }

    // Interactive bonus applied by caller when element is a button/link
    if (score <= 0) continue;

    if (!best || score > best.score) {
      best = {
        methodId: method.id,
        methodLabel: getMethodLabel(method.id),
        score,
        signalTypes,
      };
    }
  }

  // Password / generic email+password submit: only if no social provider matched well
  if (!best || best.score < 7) {
    const passwordMethod = AUTH_METHODS.find((m) => m.id === 'password');
    if (passwordMethod) {
      let score = 0;
      const signalTypes: string[] = [];
      for (const phrase of passwordMethod.phrases) {
        if (containsPhrase(text, phrase) || text === phrase) {
          score += phrase.includes('password') ? 8 : 6;
          signalTypes.push('exact-label');
          break;
        }
      }
      if (score > 0 && AUTH_VERBS.test(text)) {
        score += 2;
        signalTypes.push('auth-verb');
      }
      if (score >= 7 && (!best || score > best.score)) {
        best = {
          methodId: 'password',
          methodLabel: 'Password',
          score,
          signalTypes,
        };
      }
    }
  }

  // Interactive element bonus for any match
  if (best && best.score > 0) {
    best = {
      ...best,
      score: best.score + 2,
      signalTypes: [...best.signalTypes, 'interactive'],
    };
  }

  return best;
}

export const CANDIDATE_THRESHOLD = 7;
