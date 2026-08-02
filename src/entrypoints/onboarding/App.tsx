export default function App() {
  return (
    <div className="wrap">
      <h1>Last Sign-in</h1>
      <p className="lead">
        Remember how you signed in here last time — without remembering your
        credentials.
      </p>

      <section className="panel">
        <h2>What we store</h2>
        <ul>
          <li>The site (domain / origin)</li>
          <li>The sign-in method type (GitHub, Google, SSO, email…)</li>
          <li>An optional label you choose, like Work or Personal</li>
        </ul>
      </section>

      <section className="panel">
        <h2>What we never store</h2>
        <ul>
          <li>Passwords, emails, usernames, or phone numbers</li>
          <li>Cookies, session tokens, or OAuth codes</li>
          <li>Form contents or keystrokes</li>
        </ul>
      </section>

      <section className="panel">
        <h2>How to use it</h2>
        <ul>
          <li>Open a login page and click the Last Sign-in icon.</li>
          <li>Choose <strong>Enable on this site</strong> (permission for that site only).</li>
          <li>Sign in as usual — we remember the method you clicked.</li>
          <li>Next visit, look for the LAST USED badge on that option.</li>
        </ul>

        <div className="demo" aria-hidden="true">
          <button type="button" className="demo-btn" tabIndex={-1}>
            Continue with GitHub
          </button>
          <span className="demo-badge">LAST USED</span>
        </div>
      </section>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.close()}
        >
          Got it
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Open settings
        </button>
      </div>
    </div>
  );
}
