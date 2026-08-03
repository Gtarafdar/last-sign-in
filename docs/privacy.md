# Privacy Policy — Last Sign-in

**Last updated:** August 3, 2026

## Summary

Last Sign-in is a privacy-first Chrome extension. It remembers **which sign-in method** you used on a website (for example GitHub, Google, SSO, or password). It does **not** read passwords, cookies, session tokens, or OAuth codes from web pages, and it does **not** scrape email addresses or usernames from forms.

All data stays in your browser via `chrome.storage.local`. This version has no Last Sign-in cloud, no analytics SDK, and no account signup.

## What we store

- Website origin / site key
- Sign-in method id and display label (e.g. `github` / `GitHub`)
- Optional **reminder label you type yourself** (e.g. Work, Personal, or a name/email you choose) — maximum 64 characters, local only. This is never scraped from the page.
- Confidence state (`pending`, `confirmed`, or `manual`)
- Timestamps for last selected / confirmed
- Per-site preferences (hide badge, disable)
- Extension settings

## What we never store

- Passwords
- Emails, usernames, or phone numbers scraped from the page or form fields
- OTP or recovery codes
- Form field values (except the optional reminder label you deliberately type in the extension UI)
- Cookies or website storage
- OAuth authorization codes, access tokens, or refresh tokens
- Full URLs with query strings or fragments
- Keystrokes or browsing history unrelated to recognized login controls
- Analytics events (no analytics SDK in this product)

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save method records and settings on your device |
| `activeTab` | Act on the page you are viewing when you use the extension |
| `scripting` | Inject the helper script after you enable a site |
| Optional host access | Only after you choose **Enable on this site** (permission is requested for that origin) — so the badge can appear on future visits |

We do not request cookie, history, identity, or network-inspection permissions.

## Chrome Web Store User Data Policy (Limited Use)

Last Sign-in handles only the local data described above, and only to provide its single purpose: reminding you which sign-in method you used on a site.

- Data is stored **locally** on your device. It is **not** transmitted to Last Sign-in servers (there are none in this version).
- We do **not** sell user data.
- We do **not** use this data for advertising, creditworthiness, or unrelated purposes.
- Use of information received from Google APIs (if any are used by Chrome for extension distribution) will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Data retention

- Confirmed and manual records remain until you delete them.
- Pending (unconfirmed) records expire based on your setting (default 30 days).
- Deleting a site or using **Delete all** removes data immediately from extension storage.
- Uninstalling the extension removes local extension storage according to Chrome’s normal behavior.

## Contact

Privacy and product support for Last Sign-in:

- Support page: [https://gtarafdar.github.io/last-sign-in/#support](https://gtarafdar.github.io/last-sign-in/#support)
- Email: gobinda.ext1@gmail.com
- GitHub Issues: [https://github.com/Gtarafdar/last-sign-in/issues](https://github.com/Gtarafdar/last-sign-in/issues)

Developer: Gobinda Tarafdar · [Maker page](https://gtarafdar.github.io/porter/#maker)
