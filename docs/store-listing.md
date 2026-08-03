# Chrome Web Store listing — Last Sign-in

Paste-ready fields for the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).  
Upload package: **v0.1.3** → `last-sign-in-0.1.3-chrome.zip` from [Releases](https://github.com/Gtarafdar/last-sign-in/releases/tag/v0.1.3).

Privacy policy URL (required):  
`https://gtarafdar.github.io/last-sign-in/privacy.md`

---

## Store Listing tab

### Name

Last Sign-in

### Summary / short description (≤132 characters)

See which sign-in method you used last time. Stored on your device, without passwords, emails, cookies, or tokens.

*(114 characters)*

### Detailed description

Tired of guessing whether you used GitHub, Google, SSO, or password last time?

Last Sign-in remembers the **type** of sign-in method you chose on each website and shows a small LAST USED (or LAST SELECTED) label next to that option when you return.

**Privacy first**
- Does not read passwords, cookies, or tokens from the page
- Does not scrape emails from forms — optional name/email labels are only what you type yourself
- Data stays on your device
- You enable the extension per site

**How it works**
1. Open a sign-in page
2. Click the extension → Enable on this site
3. Sign in as usual — we try to mark that method next time
4. If auto-detect can’t pin icon-only buttons, save the method manually (optional name/email reminder label)

**Honest confidence**
- LAST SELECTED = you clicked it
- LAST USED / Manual = you confirmed it or saved it yourself

Edit any saved site from Settings. Forget one site or delete all anytime.

No account required. No backend. No analytics in this version.

MIT licensed: https://github.com/Gtarafdar/last-sign-in

### Category

Productivity

### Language

English

### Store images (upload from `docs/store/`)

| Asset | File | Size |
| --- | --- | --- |
| Extension icon | `docs/icon/128.png` (also in package) | 128×128 |
| Small promo tile (**required**) | `docs/store/promo-small-440x280.png` | 440×280 |
| Marquee promo (optional) | `docs/store/promo-marquee-1400x560.png` | 1400×560 |
| Screenshot 1 | `docs/store/01-welcome.png` | 1280×800 |
| Screenshot 2 | `docs/store/02-manual.png` | 1280×800 |
| Screenshot 3 | `docs/store/03-badge.png` | 1280×800 |
| Screenshot 4 | `docs/store/04-settings.png` | 1280×800 |

---

## Privacy tab

### Single purpose

Reminds you which sign-in method you previously used on a website (for example Google, GitHub, SSO, or password) by storing the method type locally and showing a LAST USED / LAST SELECTED label. It does not store passwords or scrape credentials.

### Permission justifications

**storage**  
Save which sign-in method type you used on which site, optional user-typed reminder labels, and extension settings — all in `chrome.storage.local` on the device.

**activeTab**  
When you open the popup or enable a site, act on the tab you are viewing so we can request host access for that origin and refresh reminders.

**scripting**  
Inject the content helper after you enable a site so we can detect login controls you click and show the on-page badge.

**Optional host permissions (`http://*/*`, `https://*/*`)**  
Declared as optional only. When you choose **Enable on this site**, Chrome asks for permission for **that origin** (`https://example.com/*`). We do not use broad host access to read unrelated browsing. Host access is required so the badge and method detection can run on future visits to sites you opted into.

### Data collection / remote use

Disclose accurately in the dashboard checkboxes:

- **Does not** collect user data remotely / does not transmit browsing data to a Last Sign-in server
- Local storage only: origins, method types, optional labels you type, timestamps, settings
- No personally identifiable information is scraped from pages
- No sale of user data; Limited Use compliance described in the privacy policy

### Privacy policy URL

`https://gtarafdar.github.io/last-sign-in/privacy.md`

---

## Distribution tab

- Visibility: Public (or Unlisted first if you prefer a soft launch)
- Pricing: Free
- Regions: All regions (or as you prefer)

---

## Test instructions (for reviewers)

1. Install the uploaded package (or Load unpacked from the zip contents).
2. Open any HTTPS login page (e.g. a site with “Continue with Google/GitHub”).
3. Click the Last Sign-in toolbar icon → **Enable on this site** → accept the origin permission prompt.
4. Click a sign-in method on the page, or use **Save method manually** in the popup (pick method; optional name/email label).
5. Re-open the login UI (or revisit later): expect a LAST USED / LAST SELECTED cue when detectable, or the manual reminder.
6. Open extension **Options** → Saved sites → **Edit** a row → change method or label → Save. Confirm status shows Manual.
7. Use **Forget** on one site; confirm the row is removed.
8. Confirm no network calls to a Last Sign-in backend (local-only product).

Support / issues: https://github.com/Gtarafdar/last-sign-in/issues

---

## Homepage / support URLs (optional fields)

- Homepage: `https://gtarafdar.github.io/last-sign-in/`
- Support: `https://github.com/Gtarafdar/last-sign-in/issues`
