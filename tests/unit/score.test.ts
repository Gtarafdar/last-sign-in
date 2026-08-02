import { describe, expect, it } from 'vitest';
import {
  containsPhrase,
  normalizeText,
  scoreCandidateText,
} from '../../src/lib/score';

describe('normalizeText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeText('  Continue   with  GitHub  ')).toBe(
      'continue with github',
    );
  });
});

describe('containsPhrase', () => {
  it('matches whole words only', () => {
    expect(containsPhrase('continue with github', 'github')).toBe(true);
    expect(containsPhrase('pineapple pie', 'apple')).toBe(false);
    expect(containsPhrase('sign in with apple', 'apple')).toBe(true);
  });
});

describe('scoreCandidateText', () => {
  it('scores Continue with GitHub highly', () => {
    const result = scoreCandidateText('Continue with GitHub');
    expect(result?.methodId).toBe('github');
    expect(result!.score).toBeGreaterThanOrEqual(7);
  });

  it('scores icon-only google hints from class/testid style strings', () => {
    const result = scoreCandidateText('oauth-google-btn data-provider=google');
    expect(result?.methodId).toBe('google');
    expect(result!.score).toBeGreaterThanOrEqual(7);
  });

  it('scores Google via oauth host', () => {
    const withLabel = scoreCandidateText(
      'Sign in with Google',
      'accounts.google.com',
    );
    expect(withLabel?.methodId).toBe('google');
    expect(withLabel!.score).toBeGreaterThanOrEqual(7);
  });

  it('rejects logout controls', () => {
    expect(scoreCandidateText('Sign out of GitHub')).toBeNull();
  });

  it('does not treat password field labels as social login via bare apple in pineapple', () => {
    expect(containsPhrase(normalizeText('pineapple'), 'apple')).toBe(false);
  });

  it('detects SSO', () => {
    const result = scoreCandidateText('Continue with SSO');
    expect(result?.methodId).toBe('sso');
  });

  it('detects passkey', () => {
    const result = scoreCandidateText('Sign in with a passkey');
    expect(result?.methodId).toBe('passkey');
  });

  it('detects Microsoft', () => {
    const result = scoreCandidateText('Sign in with Microsoft');
    expect(result?.methodId).toBe('microsoft');
  });

  it('scores sign up with google without killing the match', () => {
    const result = scoreCandidateText('Sign up with Google');
    expect(result?.methodId).toBe('google');
    expect(result!.score).toBeGreaterThanOrEqual(7);
  });
});
