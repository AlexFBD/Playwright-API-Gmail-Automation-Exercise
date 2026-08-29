# Gmail Spam Cleaner — Playwright + Cypress

Automation that opens Gmail, goes to the **Spam** folder, and empties it.

## Authentication

Not solved yet. Google shows *"This browser or app may not be secure"* for scripted
Chromium sessions, so the specs assume the browser is **already signed in** and fail
fast if Gmail redirects to `accounts.google.com`.

Options worth exploring:

- Launch a persistent Chrome profile (`launchPersistentContext` pointed at your real
  user data dir) so the session already exists.
- Use the official Gmail API instead of the UI (`users.messages.list` with
  `q=in:spam`, then `users.messages.batchDelete`).

## Setup

```
npm install
cp .env.example .env
```

## Running

Both runners are dry-run by default. Set `CONFIRM_DELETE=true` in `.env` to delete.

```
npm run pw:test       # Playwright (recommended)
npm run pw:headed     # watch it happen
npm run pw:report     # HTML report

npm run cy:open       # Cypress interactive
npm run cy:run        # Cypress headless
```

The login-page smoke tests need no session at all:

```
npx playwright test tests/login-page.spec.ts
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/config.ts` | URLs, env flags, all Gmail text selectors in one place |
| `src/pages/GmailSpamPage.ts` | Playwright page object for the Spam view |
| `tests/login-page.spec.ts` | Signed-out smoke tests against the Google login page |
| `tests/gmail-spam.spec.ts` | Playwright spam specs |
| `cypress/support/e2e.ts` | `visitSpam` custom command |
| `cypress/e2e/gmail-spam.cy.ts` | Cypress spam spec |

## Delete strategy

1. Click **“Delete all spam messages now”** (Gmail's own bulk shortcut — fastest).
2. Fallback: select-all checkbox → **Delete forever**.
3. Confirm the **OK / Delete** dialog if it appears.
4. Assert the message list is empty.

## Known limitations

- **Playwright is the reliable runner.** Cypress runs the app under test inside an
  iframe; Gmail is frame-hostile, so `chromeWebSecurity: false` and
  `experimentalModifyObstructiveThirdPartyCode` are required and the spec may still
  break when Google changes headers. Keep the Cypress spec as a secondary check.
- Gmail's DOM classes (`tr.zA`) and UI copy change without notice. Selectors are
  centralized in `src/config.ts` for quick repair.
- Emptying spam is **permanent**. There is no undo.
- Automating the Gmail web UI is discouraged by Google's terms. For anything
  production-grade or scheduled, the official Gmail API is faster, supported, and
  won't break on UI changes.
