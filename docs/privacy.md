# Privacy Policy — Last Sign-in

**Last updated:** August 2, 2026

## Summary

Last Sign-in is a privacy-first Chrome extension. It remembers **which sign-in method** you used on a website (for example GitHub, Google, SSO, or email/password). It does **not** read or store passwords, email addresses, usernames, cookies, session tokens, or OAuth codes.

All data stays in your browser via `chrome.storage.local` unless you later opt into a sync feature (not included in the current version).

## What we store

- Website origin / site key
- Sign-in method id and display label (e.g. `github` / `GitHub`)
- Optional reminder label you type (e.g. Work, Personal, or a name/email you choose) — maximum 64 characters, local only
- Confidence state (`pending`, `confirmed`, or `manual`)
- Timestamps for last selected / confirmed
- Per-site preferences (hide badge, disable)
- Extension settings

## What we never store

- Passwords
- Emails, usernames, or phone numbers
- OTP or recovery codes
- Form field values
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
| Optional host access | Only after you choose **Enable on this site** — so the badge can appear automatically on future visits |

We do not request cookie, history, identity, or network-inspection permissions.

## Data retention

- Confirmed and manual records remain until you delete them.
- Pending (unconfirmed) records expire based on your setting (default 30 days).
- Deleting a site or using **Delete all** removes data immediately from extension storage.
- Uninstalling the extension removes local extension storage according to Chrome’s normal behavior.

## Contact

For privacy questions about this extension, use the support channel listed on the Chrome Web Store listing for Last Sign-in.
