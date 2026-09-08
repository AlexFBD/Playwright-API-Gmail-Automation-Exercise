# Gmail Spam and Bin Cleaner — Playwright + Gmail API

Playwright runs a public Gmail-login UI smoke test and a protected Gmail API integration
suite that can list and permanently clean the authenticated account's **Spam** and
**Bin** folders.

## Setup

```
npm install
cp .env.example .env
```

## Running

The UI login tests require no credentials. The Gmail API suite is skipped unless all OAuth
variables below are set. Deletion is disabled by default. Use
`CONFIRM_DELETE_FIRST=true` for one Spam message or `CONFIRM_DELETE_ALL=true` for all
Spam messages; these confirmations are deliberately separate.
Bin deletion uses separate flags: `CONFIRM_DELETE_BIN_FIRST=true` for one email and
`CONFIRM_DELETE_BIN_ALL=true` for every email in the Bin.

```
npm run pw:test       # All Playwright tests; Gmail API tests skip without credentials
npm run pw:login      # Public, signed-out Google login checks
npm run pw:gmail-api  # Protected Gmail Spam API integration tests
npx playwright test tests/gmail-bin.spec.ts  # Protected Gmail Bin API integration tests
npm run pw:headed     # watch it happen
npm run pw:report     # HTML report
```

To run only the single-message Spam deletion test, without enabling bulk deletion:

```
npx playwright test tests/gmail-spam.spec.ts --grep "deletes the first"
```

## Gmail API setup

1. Create a Google Cloud project, enable the Gmail API, and create an OAuth 2.0 client.
2. Download its client-secret JSON file outside this repository, then run the one-time
   helper below. For a **Desktop** OAuth client, it uses a local loopback callback
   automatically. For a **Web** client, first register an exact local redirect URI in
   Google Cloud, such as `http://127.0.0.1:3000/oauth2callback`.

   ```
   npm run gmail:authorize -- /absolute/path/to/client_secret.json
   # Web client only:
   npm run gmail:authorize -- /absolute/path/to/client_secret.json \\
     --redirect-uri http://127.0.0.1:3000/oauth2callback
   ```

   The helper prints only `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and
   `GMAIL_REFRESH_TOKEN` after browser consent. Copy those into `.env` and then
   delete or securely store the downloaded JSON file.
3. The authorization flow requests offline access and the
   `https://mail.google.com/` scope. This full scope is required by Gmail's permanent
   [`messages.batchDelete`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchDelete)
   endpoint.
4. Add `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` to `.env`.
   Never commit this file. Store the same values as repository/environment secrets for
   a future protected GitHub Actions workflow.

Google's [OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
describes obtaining and using a refresh token. The API client pages through Gmail's
Spam and Bin labels (up to 500 messages per request) and uses `batchDelete`; this is
supported API automation rather than browser UI automation.

The public login smoke tests need no session at all:

```
npx playwright test tests/login-page.spec.ts
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/gmail/GmailApiClient.ts` | OAuth refresh and Gmail Spam/Bin API client |
| `tests/login-page.spec.ts` | Signed-out smoke tests against the Google login page |
| `tests/gmail-spam.spec.ts` | Guarded Gmail Spam API integration tests |
| `tests/gmail-bin.spec.ts` | Guarded Gmail Bin API integration tests |
| `.env.example` | Required Gmail API environment-variable names |

## Delete strategy

1. Refresh an OAuth access token using the stored refresh token.
2. List messages with Gmail's `SPAM` or `TRASH` label.
3. List message subjects, delete one selected message, or call Gmail's `batchDelete`
   endpoint for a confirmed bulk cleanup.
4. Poll until the relevant Spam or Bin label is empty after a bulk cleanup.

## Known limitations

- Permanently deleting Spam or Bin messages is **permanent**. There is no undo.
- `messages.batchDelete` requires the broad `https://mail.google.com/` scope. Use a
  dedicated account and keep its refresh token only in secure local storage or GitHub
  Secrets.
