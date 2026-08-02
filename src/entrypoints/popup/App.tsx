import { useCallback, useEffect, useState } from 'react';
import { AUTH_METHODS } from '~/lib/methods';
import { sendMessage, type SiteState } from '~/lib/messages';
import type { AuthMethodId, Confidence } from '~/lib/types';

type TabInfo = { url: string; id: number } | null;

type PageBadgeStatus = {
  nativeLastUsed: boolean;
  showingOurs: boolean;
  skipReason?: string | null;
  loginSurface?: boolean;
};

function confidencePill(confidence: Confidence): { className: string; label: string } {
  if (confidence === 'pending') {
    return { className: 'pill pill-pending', label: 'Last selected' };
  }
  if (confidence === 'manual') {
    return { className: 'pill pill-manual', label: 'Last used (manual)' };
  }
  return { className: 'pill pill-confirmed', label: 'Last used' };
}

function relativeDate(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Clear, user-facing copy when auto mode can't follow a site's login UI. */
function autoTrackNotice(status: PageBadgeStatus | null): {
  title: string;
  body: string;
} | null {
  if (!status) return null;

  // Only when a real login screen is open (same rule as page toast)
  if (!status.loginSurface) return null;

  if (status.nativeLastUsed) {
    return {
      title: 'This site already marks Last used',
      body: 'We’ll stay out of the way on the page. Your saved method still shows here and on the toolbar.',
    };
  }

  const reason = status.skipReason ?? '';
  const usingFallback =
    reason === 'surface-fallback' || reason === 'button-pin-failed-surface-ok';
  const trackingFailed =
    reason.startsWith('no-target') ||
    reason === 'show-failed' ||
    reason === 'no-record' ||
    reason.startsWith('error:');

  if (usingFallback) {
    return {
      title: 'Auto-detect had trouble with this site',
      body: 'Sorry — some sites use icon-only login buttons we can’t pin to reliably. We saved a reminder on the login panel instead. For the most accurate result, confirm or set the method manually below.',
    };
  }

  if (trackingFailed || !status.showingOurs) {
    return {
      title: 'Couldn’t auto-track this login screen',
      body: 'Sorry for the inconvenience. This site’s login UI is hard to read automatically. Please choose your method manually below — we’ll still remind you next time from that save. We never store passwords or emails.',
    };
  }

  return null;
}

export default function App() {
  const [tab, setTab] = useState<TabInfo>(null);
  const [state, setState] = useState<SiteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [editing, setEditing] = useState(false);
  const [methodId, setMethodId] = useState<AuthMethodId>('github');
  const [profileLabel, setProfileLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [pageStatus, setPageStatus] = useState<PageBadgeStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPageStatus(null);
    try {
      const [active] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!active?.id || !active.url || !/^https?:/i.test(active.url)) {
        setTab(null);
        setState(null);
        setError('Open a website to use Last Sign-in.');
        return;
      }
      setTab({ url: active.url, id: active.id });
      const site = await sendMessage<SiteState>({
        type: 'GET_CURRENT_SITE_STATE',
        payload: { url: active.url },
      });
      setState(site);
      if (site.record) {
        setMethodId(site.record.methodId);
        setProfileLabel(site.record.profileLabel ?? '');
      }

      try {
        const status = (await chrome.tabs.sendMessage(active.id, {
          type: 'GET_PAGE_BADGE_STATUS',
        })) as { ok?: boolean; data?: PageBadgeStatus } | undefined;
        if (status?.data) {
          setPageStatus({
            nativeLastUsed: Boolean(status.data.nativeLastUsed),
            showingOurs: Boolean(status.data.showingOurs),
            skipReason: status.data.skipReason ?? null,
            loginSurface: Boolean(status.data.loginSurface),
          });
        }
      } catch {
        setPageStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enableSite(always: boolean) {
    if (!tab) return;
    setBusy(true);
    setError(null);
    try {
      if (always) {
        const result = await sendMessage<{ granted: boolean }>({
          type: 'REQUEST_HOST_PERMISSION',
          payload: { origin: new URL(tab.url).origin },
        });
        if (!result.granted) throw new Error('Permission not granted');
      } else {
        await sendMessage({
          type: 'SET_ORIGIN_ENABLED',
          payload: { origin: new URL(tab.url).origin, enabled: true },
        });
      }

      // Inject content script for this tab (activeTab / host)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js'],
        });
      } catch {
        // May already be injected or path differs — still try messaging refresh
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_BADGE' });
        } catch {
          /* ignore */
        }
      }

      setAnnounce(
        always
          ? 'Always-on enabled for this site.'
          : 'Activated for this visit. Choose a sign-in method on the page.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable site');
    } finally {
      setBusy(false);
    }
  }

  async function saveMethod() {
    if (!state || !tab) return;
    setBusy(true);
    try {
      const method = AUTH_METHODS.find((m) => m.id === methodId);
      await sendMessage({
        type: 'UPDATE_SITE_RECORD',
        payload: {
          origin: state.origin,
          siteKey: state.siteKey,
          methodId,
          methodLabel: method?.label ?? 'Custom',
          profileLabel: profileLabel.trim() || null,
          confidence: 'manual',
        },
      });

      // Force content script present + redraw pill on the open login UI
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js'],
        });
      } catch {
        /* may already be injected */
      }
      try {
        const status = (await chrome.tabs.sendMessage(tab.id, {
          type: 'REFRESH_BADGE',
        })) as { data?: PageBadgeStatus };
        if (status?.data?.showingOurs) {
          setAnnounce(
            `Saved ${method?.label ?? methodId}. We’ll remind you next time.`,
          );
        } else {
          setAnnounce(
            `Saved ${method?.label ?? methodId} manually. We’ll use this for reminders — sorry auto-detect struggled on this site.`,
          );
        }
      } catch {
        setAnnounce(
          `Saved ${method?.label ?? methodId} manually. We’ll remind you from this save next time.`,
        );
      }

      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmWorked() {
    if (!state) return;
    setBusy(true);
    try {
      await sendMessage({
        type: 'CONFIRM_SITE_RECORD',
        payload: { origin: state.origin, siteKey: state.siteKey },
      });
      setAnnounce('Marked as last used.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(false);
    }
  }

  async function forgetSite() {
    if (!state) return;
    setBusy(true);
    try {
      await sendMessage({
        type: 'DELETE_SITE_RECORD',
        payload: { origin: state.origin, siteKey: state.siteKey },
      });
      setAnnounce('Forgot this site.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function hideBadge() {
    if (!state?.record) return;
    setBusy(true);
    try {
      await sendMessage({
        type: 'UPDATE_SITE_RECORD',
        payload: {
          origin: state.origin,
          siteKey: state.siteKey,
          pageBadgeHidden: !state.record.pageBadgeHidden,
        },
      });
      setAnnounce(
        state.record.pageBadgeHidden
          ? 'Page badge shown again.'
          : 'Page badge hidden on this site.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function disableSite() {
    if (!state) return;
    setBusy(true);
    try {
      if (state.record) {
        await sendMessage({
          type: 'UPDATE_SITE_RECORD',
          payload: {
            origin: state.origin,
            siteKey: state.siteKey,
            disabled: true,
          },
        });
      }
      await sendMessage({
        type: 'SET_ORIGIN_ENABLED',
        payload: { origin: state.origin, enabled: false },
      });
      setAnnounce('Disabled on this site.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disable failed');
    } finally {
      setBusy(false);
    }
  }

  const hostname = state?.siteKey ?? (tab ? new URL(tab.url).hostname : '');
  const notice = autoTrackNotice(pageStatus);
  const needsManualHelp =
    Boolean(notice) &&
    (!state?.record ||
      state.record.confidence === 'pending' ||
      pageStatus?.skipReason?.startsWith('no-target') ||
      pageStatus?.skipReason === 'show-failed' ||
      pageStatus?.skipReason === 'no-login-surface' ||
      (!pageStatus?.showingOurs && pageStatus?.loginSurface));

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <h1>Last Sign-in</h1>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          aria-label="Open settings"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Settings
        </button>
      </header>

      <div className="content">
        <div className="live" role="status" aria-live="polite">
          {announce}
        </div>

        {loading && <p className="muted">Loading…</p>}

        {!loading && !state && (
          <section className="card empty-state">
            <h2>Remember how you signed in</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Open any login page, then come back here. Last Sign-in remembers
              the method you used — GitHub, Google, SSO, and so on — not your
              password or email.
            </p>
            <ol className="empty-steps">
              <li>Go to a site’s sign-in page</li>
              <li>Click <strong>Enable on this site</strong></li>
              <li>Sign in as usual — we mark that method next time</li>
            </ol>
            {error && error !== 'Open a website to use Last Sign-in.' && (
              <p className="muted" style={{ margin: '10px 0 0' }}>
                {error}
              </p>
            )}
          </section>
        )}

        {!loading && state && (
          <>
            <section className="card">
              <div className="row">
                <div>
                  <h2>{hostname}</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {state.hasHostPermission
                      ? 'Always watching this site'
                      : state.enabled
                        ? 'Enabled for this browser profile'
                        : 'Not enabled yet'}
                  </p>
                </div>
              </div>

              {!state.hasHostPermission && (
                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={busy}
                    onClick={() => void enableSite(true)}
                  >
                    Enable on this site
                  </button>
                  <p className="muted" style={{ margin: 0 }}>
                    Grants permission only for {hostname}. No passwords or emails
                    are read.
                  </p>
                </div>
              )}
            </section>

            {notice && (
              <section className="notice" role="status">
                <h2>{notice.title}</h2>
                <p>{notice.body}</p>
                {needsManualHelp && !editing && (
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    style={{ marginTop: 10 }}
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    Save method manually
                  </button>
                )}
              </section>
            )}

            <section className="card">
              {state.record && !state.record.disabled ? (
                <>
                  <div className="row">
                    <h2>{state.record.methodLabel}</h2>
                    <span
                      className={
                        confidencePill(state.record.confidence).className
                      }
                    >
                      {confidencePill(state.record.confidence).label}
                    </span>
                  </div>
                  {state.record.profileLabel && (
                    <p className="muted" style={{ margin: '6px 0 0' }}>
                      Profile: {state.record.profileLabel}
                    </p>
                  )}
                  <p className="muted" style={{ margin: '6px 0 0' }}>
                    Selected {relativeDate(state.record.lastSelectedAt)}
                  </p>
                  {state.record.confidence === 'manual' && (
                    <p className="muted" style={{ margin: '6px 0 0' }}>
                      Saved manually — we’ll use this to remind you next visit.
                    </p>
                  )}

                  {state.record.confidence === 'pending' && (
                    <div className="actions" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        disabled={busy}
                        onClick={() => void confirmWorked()}
                      >
                        Yes, this worked
                      </button>
                      <p className="muted" style={{ margin: 0 }}>
                        Confirms this method as LAST USED for next time.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2>No method saved yet</h2>
                  <p className="muted">
                    If auto-detect misses your click, save the method manually.
                    We’ll still remind you next time — we never store passwords
                    or emails.
                  </p>
                </>
              )}

              {editing ? (
                <div className="actions" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label htmlFor="method">Method</label>
                    <select
                      id="method"
                      value={methodId}
                      onChange={(e) =>
                        setMethodId(e.target.value as AuthMethodId)
                      }
                    >
                      {AUTH_METHODS.filter((m) => m.id !== 'password').map(
                        (m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ),
                      )}
                      <option value="password">Password</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="profile">
                      Name or email label (optional)
                    </label>
                    <input
                      id="profile"
                      maxLength={64}
                      placeholder="Work, Personal, you@…"
                      value={profileLabel}
                      onChange={(e) => setProfileLabel(e.target.value)}
                    />
                    <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                      Local reminder only — never sent anywhere. Handy when you
                      save a method manually (e.g. Product Hunt).
                    </p>
                  </div>
                  <div className="actions-row">
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void saveMethod()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-block"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    {state.record ? 'Change method' : 'Choose manually'}
                  </button>
                  {state.record && (
                    <div className="actions-row">
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => void hideBadge()}
                      >
                        {state.record.pageBadgeHidden
                          ? 'Show badge'
                          : 'Hide badge'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={busy}
                        onClick={() => void forgetSite()}
                      >
                        Forget site
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-block"
                    disabled={busy}
                    onClick={() => void disableSite()}
                  >
                    Disable on this site
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
