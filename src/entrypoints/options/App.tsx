import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_METHODS } from '~/lib/methods';
import { sendMessage } from '~/lib/messages';
import type { AuthMethodId, Settings, SiteRecord } from '~/lib/types';

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [records, setRecords] = useState<SiteRecord[]>([]);
  const [query, setQuery] = useState('');
  const [announce, setAnnounce] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<AuthMethodId>('google');
  const [profileLabel, setProfileLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, r] = await Promise.all([
        sendMessage<Settings>({ type: 'GET_SETTINGS' }),
        sendMessage<SiteRecord[]>({ type: 'LIST_RECORDS' }),
      ]);
      setSettings(s);
      setRecords(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.siteKey.includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.methodLabel.toLowerCase().includes(q) ||
        (r.profileLabel ?? '').toLowerCase().includes(q),
    );
  }, [records, query]);

  function startEdit(record: SiteRecord) {
    setEditingId(record.id);
    setMethodId(record.methodId);
    setProfileLabel(record.profileLabel ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setProfileLabel('');
  }

  async function patchSettings(patch: Partial<Settings>) {
    if (!settings) return;
    const next = await sendMessage<Settings>({
      type: 'UPDATE_SETTINGS',
      payload: patch,
    });
    setSettings(next);
    setAnnounce('Settings saved.');
  }

  async function saveEdit(record: SiteRecord) {
    setBusy(true);
    setError(null);
    try {
      const method = AUTH_METHODS.find((m) => m.id === methodId);
      await sendMessage({
        type: 'UPDATE_SITE_RECORD',
        payload: {
          origin: record.origin,
          siteKey: record.siteKey,
          methodId,
          methodLabel: method?.label ?? 'Custom',
          profileLabel: profileLabel.trim() || null,
          confidence: 'manual',
        },
      });
      setAnnounce(`Updated ${record.siteKey}.`);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update site');
    } finally {
      setBusy(false);
    }
  }

  async function forget(record: SiteRecord) {
    if (editingId === record.id) cancelEdit();
    await sendMessage({
      type: 'DELETE_SITE_RECORD',
      payload: { origin: record.origin, siteKey: record.siteKey },
    });
    setAnnounce(`Forgot ${record.siteKey}.`);
    await load();
  }

  async function deleteAll() {
    if (
      !confirm(
        'Delete all saved sign-in methods? This cannot be undone.',
      )
    ) {
      return;
    }
    cancelEdit();
    await sendMessage({ type: 'DELETE_ALL_RECORDS' });
    setAnnounce('All records deleted.');
    await load();
  }

  return (
    <div className="page">
      <header>
        <h1>Last Sign-in</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Remembers how you signed in — never your passwords, emails, cookies, or
          tokens. Everything stays on this device.
        </p>
      </header>

      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
      {error && <p className="muted">{error}</p>}

      {settings && (
        <section className="section">
          <h2>General</h2>
          <div className="toggle-row">
            <div>
              <strong>Show page badges</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                LAST USED / LAST SELECTED label on login buttons
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showPageBadge}
              aria-label="Show page badges"
              onChange={(e) =>
                void patchSettings({ showPageBadge: e.target.checked })
              }
            />
          </div>
          <div className="toggle-row">
            <div>
              <strong>Show toolbar badge</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Short method or profile abbreviation on the icon
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showToolbarBadge}
              aria-label="Show toolbar badge"
              onChange={(e) =>
                void patchSettings({ showToolbarBadge: e.target.checked })
              }
            />
          </div>
          <div className="toggle-row">
            <div>
              <strong>Pending record lifetime</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Unconfirmed selections expire after this period
              </p>
            </div>
            <select
              value={settings.pendingTtlDays ?? 'never'}
              aria-label="Pending record lifetime"
              onChange={(e) => {
                const v = e.target.value;
                void patchSettings({
                  pendingTtlDays:
                    v === 'never' ? null : (Number(v) as 7 | 30 | 90),
                });
              }}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value="never">Never</option>
            </select>
          </div>
        </section>
      )}

      <section className="section">
        <h2>Saved sites</h2>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="search">Search</label>
          <input
            id="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by domain or method"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="muted empty">No saved sign-in methods yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Method</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <tr key={r.id} className={isEditing ? 'row-editing' : undefined}>
                    <td>
                      <div>{r.siteKey}</div>
                      {!isEditing && r.profileLabel && (
                        <div className="muted">{r.profileLabel}</div>
                      )}
                      {isEditing && (
                        <div className="edit-panel">
                          <div className="field">
                            <label htmlFor={`method-${r.id}`}>Method</label>
                            <select
                              id={`method-${r.id}`}
                              value={methodId}
                              disabled={busy}
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
                            <label htmlFor={`profile-${r.id}`}>
                              Name or email label (optional)
                            </label>
                            <input
                              id={`profile-${r.id}`}
                              maxLength={64}
                              placeholder="Work, Personal, you@…"
                              value={profileLabel}
                              disabled={busy}
                              onChange={(e) => setProfileLabel(e.target.value)}
                            />
                            <p className="muted field-hint">
                              Local reminder only — never sent anywhere.
                            </p>
                          </div>
                          <div className="actions-row">
                            <button
                              type="button"
                              className="btn"
                              disabled={busy}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => void saveEdit(r)}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>{isEditing ? '—' : r.methodLabel}</td>
                    <td>
                      {isEditing
                        ? '—'
                        : r.confidence === 'pending'
                          ? 'Last selected'
                          : r.confidence === 'manual'
                            ? 'Manual'
                            : 'Confirmed'}
                    </td>
                    <td>
                      <div className="actions-row">
                        {!isEditing && (
                          <button
                            type="button"
                            className="btn"
                            disabled={busy}
                            onClick={() => startEdit(r)}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={busy}
                          onClick={() => void forget(r)}
                        >
                          Forget
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Privacy & storage</h2>
        <p className="muted">
          Local-only storage is the default. This extension does not send browsing
          data to a server, and it never reads passwords, emails, cookies, or
          authentication tokens.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => void deleteAll()}>
          Delete all saved site records
        </button>
      </section>
    </div>
  );
}
