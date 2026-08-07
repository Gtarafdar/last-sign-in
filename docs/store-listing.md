# Chrome Web Store listing — Last Sign-in

**Live listing:** https://chromewebstore.google.com/detail/last-sign-in/ipcpmefhaeegbdglbbhjegflgibnndjp

Guide for the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).

**Important:** The Store **Description** field is **plain text only**. It does **not** render Markdown. Do not paste this whole file into Description — paste only the block under “Description (paste this)”.

- Upload package: v0.1.3 → https://github.com/Gtarafdar/last-sign-in/releases/download/v0.1.3/last-sign-in-0.1.3-chrome.zip
- Privacy policy URL: https://gtarafdar.github.io/last-sign-in/privacy.md
- Plain description also saved as: `docs/store/description.txt`

---

## Store Listing tab

### Name

```
Last Sign-in
```

### Summary (≤132 characters — from package / short description)

```
See which sign-in method you used last time. Stored on your device, without passwords, emails, cookies, or tokens.
```

### Description (paste this)

Copy everything inside the box below into the dashboard **Description** field — plain text, no Markdown:

```
Tired of guessing whether you used GitHub, Google, SSO, or password last time?

Last Sign-in remembers the type of sign-in method you chose on each website and shows a small LAST USED (or LAST SELECTED) label next to that option when you return.

Privacy first
- Does not read passwords, cookies, or tokens from the page
- Does not scrape emails from forms — optional name/email labels are only what you type yourself
- Data stays on your device
- You enable the extension per site

How it works
1. Open a sign-in page
2. Click the extension → Enable on this site
3. Sign in as usual — we try to mark that method next time
4. If auto-detect can’t pin icon-only buttons, save the method manually (optional name/email reminder label)

Honest confidence
- LAST SELECTED = you clicked it
- LAST USED / Manual = you confirmed it or saved it yourself

Edit any saved site from Settings. Forget one site or delete all anytime.

No account required. No backend. No analytics in this version.

Homepage: https://gtarafdar.github.io/last-sign-in/
Source: https://github.com/Gtarafdar/last-sign-in
Support: https://github.com/Gtarafdar/last-sign-in/issues
```

### Category

Productivity

### Language

English

### Store images (upload from docs/store/)

| Asset | File | Size |
| --- | --- | --- |
| Extension icon | docs/icon/128.png (also in package) | 128×128 |
| Small promo tile (required) | docs/store/promo-small-440x280.png | 440×280 |
| Marquee promo (optional) | docs/store/promo-marquee-1400x560.png | 1400×560 |
| Screenshot 1 | docs/store/01-welcome.png | 1280×800 |
| Screenshot 2 | docs/store/02-manual.png | 1280×800 |
| Screenshot 3 | docs/store/03-badge.png | 1280×800 |
| Screenshot 4 | docs/store/04-settings.png | 1280×800 |

---

## Privacy tab

Open **Privacy practices**, paste the fields below (or open `docs/store/privacy-practices.txt`), check the certification boxes, then **Save draft**.

### Single purpose (paste this)

```
Reminds you which sign-in method you previously used on a website (for example Google, GitHub, SSO, or password) by storing the method type locally and showing a LAST USED / LAST SELECTED label. It does not store passwords or scrape credentials.
```

### Permission justifications (paste each)

**storage**

```
Save which sign-in method type you used on which site, optional user-typed reminder labels, and extension settings. All data is stored in chrome.storage.local on the user’s device only.
```

**activeTab**

```
Used when the user opens the extension popup on the current tab so we can identify that page’s origin, offer Enable on this site, and refresh the on-page reminder for the active tab after they save a method.
```

**scripting**

```
Used to inject our content helper on sites the user has enabled so we can detect clicks on sign-in method buttons and display the LAST USED / LAST SELECTED badge. Scripting is not used to read passwords or scrape form values.
```

**Host permission**

```
Host access is optional. When the user chooses Enable on this site, Chrome prompts for permission for that origin only (for example https://example.com/*). This allows the content script and badge to run on future visits to sites they opted into. We do not use host permission to access unrelated sites, read browsing history, or collect credentials.
```

### Remote code

Select: **No, I am not using remote code.**

If a text box still appears, paste:

```
This extension does not execute remote code. All JavaScript and logic ship inside the uploaded package (Manifest V3). There is no CDN script loading, no eval of remote scripts, and no Last Sign-in server that serves executable code.
```

### Privacy policy URL

```
https://gtarafdar.github.io/last-sign-in/privacy.md
```

### Data usage certification

Check every required box that your data usage complies with the Developer Program Policies.

For this extension:
- Does not collect or transmit user data to a remote Last Sign-in server
- Local storage only (origins, method types, optional typed labels, timestamps, settings)
- No sale of user data; not used for advertising
- Only what is needed for the single purpose above

---

## Distribution tab

- Visibility: Public (or Unlisted for a soft launch)
- Pricing: Free
- Regions: All regions (or as you prefer)

---

## Test instructions (paste for reviewers)

```
1. Install the uploaded package (or Load unpacked from the zip contents).
2. Open any HTTPS login page (for example a site with Continue with Google or GitHub).
3. Click the Last Sign-in toolbar icon → Enable on this site → accept the origin permission prompt.
4. Click a sign-in method on the page, or use Save method manually in the popup (pick method; optional name/email label).
5. Re-open the login UI (or revisit later): expect a LAST USED / LAST SELECTED cue when detectable, or the manual reminder.
6. Open extension Options → Saved sites → Edit a row → change method or label → Save. Confirm status shows Manual.
7. Use Forget on one site; confirm the row is removed.
8. Confirm no network calls to a Last Sign-in backend (local-only product).

Support: https://github.com/Gtarafdar/last-sign-in/issues
```

---

## Homepage / support URLs

```
Homepage: https://gtarafdar.github.io/last-sign-in/
Support: https://gtarafdar.github.io/last-sign-in/#support
```
