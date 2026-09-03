# Gmail Spam Cleaner — Playwright + Gmail API

Playwright runs a public Gmail-login smoke test and a protected Gmail API integration
test that can permanently empty the authenticated account's **Spam** folder.

## Setup

```
npm install
cp .env.example .env
```

## Running

The login tests require no credentials. The Gmail API suite is skipped unless all OAuth
variables below are set. Deletion is disabled by default; set `CONFIRM_DELETE=true` in
`.env` only when you intend to permanently delete spam.

```
npm run pw:test       # All Playwright tests; Gmail API tests skip without credentials
npm run pw:login      # Public, signed-out Google login checks
npm run pw:gmail-api  # Protected Gmail API integration tests
npm run pw:headed     # watch it happen
npm run pw:report     # HTML report
```

## Gmail API setup

1. Create a Google Cloud project, enable the Gmail API, and create an OAuth 2.0 client.
2. Obtain a refresh token for that client using offline access and the
   `https://mail.google.com/` scope. This full scope is required by Gmail's permanent
   [`messages.batchDelete`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchDelete)
   endpoint.
3. Add `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` to `.env`.
   Never commit this file. Store the same values as repository/environment secrets for
   a future protected GitHub Actions workflow.

Google's [OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
describes obtaining and using a refresh token. The API client pages through Gmail's
Spam label (up to 500 messages per request) and uses `batchDelete`; this is supported
API automation rather than browser UI automation.

The public login smoke tests need no session at all:

```
npx playwright test tests/login-page.spec.ts
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/gmail/GmailApiClient.ts` | OAuth refresh and Gmail Spam API client |
| `tests/login-page.spec.ts` | Signed-out smoke tests against the Google login page |
| `tests/gmail-spam.spec.ts` | Guarded Gmail API integration tests |
| `.env.example` | Required Gmail API environment-variable names |

## Delete strategy

1. Refresh an OAuth access token using the stored refresh token.
2. List every message with Gmail's `SPAM` label.
3. Call Gmail's `batchDelete` endpoint for the returned IDs.
4. Poll until the Spam label is empty.

## Known limitations

- Emptying spam is **permanent**. There is no undo.
- `messages.batchDelete` requires the broad `https://mail.google.com/` scope. Use a
  dedicated account and keep its refresh token only in secure local storage or GitHub
  Secrets.
