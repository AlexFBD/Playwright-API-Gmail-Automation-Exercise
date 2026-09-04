import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { resolve } from 'node:path';

const AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SCOPE = 'https://mail.google.com/';

const usage = `
Usage:
  npm run gmail:authorize -- /absolute/path/to/client_secret.json

For a Web application OAuth client, add an authorized redirect URI such as
http://127.0.0.1:3000/oauth2callback in Google Cloud, then run:
  npm run gmail:authorize -- /absolute/path/to/client_secret.json \\
    --redirect-uri http://127.0.0.1:3000/oauth2callback
`.trim();

const args = process.argv.slice(2);
const credentialFile = args.shift();
let requestedRedirectUri;

if (args[0] === '--redirect-uri' && args[1] && args.length === 2) {
  requestedRedirectUri = args[1];
} else if (args.length > 0) {
  throw new Error(usage);
}

if (!credentialFile) throw new Error(usage);

const credentialsDocument = JSON.parse(await readFile(resolve(credentialFile), 'utf8'));
const client = credentialsDocument.installed ?? credentialsDocument.web;
const clientType = credentialsDocument.installed ? 'Desktop' : credentialsDocument.web ? 'Web' : undefined;

if (!client?.client_id || !client?.client_secret || !clientType) {
  throw new Error('The supplied file is not a Google OAuth client-secret JSON file.');
}

if (clientType === 'Web' && !requestedRedirectUri) {
  throw new Error('Web clients require --redirect-uri with an exact URI registered in Google Cloud.\n\n' + usage);
}

let redirectUri = requestedRedirectUri;
let redirect = requestedRedirectUri ? new URL(requestedRedirectUri) : undefined;

if (redirect && (redirect.protocol !== 'http:' || redirect.hostname !== '127.0.0.1' || !redirect.port)) {
  throw new Error('The redirect URI must use http://127.0.0.1 with an explicit port.');
}

if (clientType === 'Web' && !client.redirect_uris?.includes(requestedRedirectUri)) {
  throw new Error(
    `The Web client JSON does not list ${requestedRedirectUri} as an authorized redirect URI. Add it in Google Cloud, download the updated JSON, and retry.`,
  );
}

const createServer = (port) =>
  new Promise((resolveServer, rejectServer) => {
    const server = http.createServer();
    server.once('error', rejectServer);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', rejectServer);
      resolveServer(server);
    });
  });

const server = await createServer(redirect ? Number(redirect.port) : 0);
const address = server.address();
if (!address || typeof address === 'string') {
  server.close();
  throw new Error('Could not determine the local callback port.');
}

if (!redirectUri) {
  redirectUri = `http://127.0.0.1:${address.port}`;
  redirect = new URL(redirectUri);
}

const state = randomBytes(32).toString('hex');
const codeVerifier = randomBytes(64).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const authorization = new URL(AUTHORIZATION_URL);
authorization.search = new URLSearchParams({
  client_id: client.client_id,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: GMAIL_SCOPE,
  access_type: 'offline',
  prompt: 'consent',
  state,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
}).toString();

try {
  console.log(`\nOpen this URL in your normal browser to continue:\n${authorization.toString()}\n`);

  const authorizationCode = await new Promise((resolveCode, rejectCode) => {
    const timeout = setTimeout(() => {
      rejectCode(new Error('Timed out waiting for Google authorization after 5 minutes.'));
    }, 5 * 60 * 1000);

    server.on('request', (request, response) => {
      const callback = new URL(request.url ?? '/', redirectUri);
      if (callback.pathname !== redirect.pathname) {
        response.writeHead(404).end('Not found');
        return;
      }

      const callbackState = callback.searchParams.get('state');
      const code = callback.searchParams.get('code');
      const error = callback.searchParams.get('error');
      const description = callback.searchParams.get('error_description');

      clearTimeout(timeout);
      if (error || !code || callbackState !== state) {
        response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
        response.end('<p>Authorization failed. Return to the terminal for details.</p>');
        rejectCode(new Error(error ? `Google authorization failed: ${description ?? error}` : 'Invalid OAuth callback.'));
        return;
      }

      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<p>Authorization complete. You may close this window and return to the terminal.</p>');
      resolveCode(code);
    });
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: authorizationCode,
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
    }),
  });
  const token = await response.json();

  if (!response.ok || !token.refresh_token) {
    throw new Error(
      `Google did not return a refresh token: ${token.error_description ?? token.error ?? response.statusText}`,
    );
  }

  console.log('\nCopy these values to .env. Do not commit or share them:\n');
  console.log(`GMAIL_CLIENT_ID=${client.client_id}`);
  console.log(`GMAIL_CLIENT_SECRET=${client.client_secret}`);
  console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
} finally {
  server.close();
}
