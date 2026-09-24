import { expect, test } from '@playwright/test';
import { GmailApiClient, type GmailApiConfig } from '../src/gmail/GmailApiClient';

const config: GmailApiConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
};

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('lists Spam subjects and uses the refreshed access token', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });

    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
    }
    if (url.includes('/messages/spam-1?')) {
      return new Response(JSON.stringify({ payload: { headers: [{ name: 'subject', value: 'Spam subject' }] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ messages: [{ id: 'spam-1' }] }), { status: 200 });
  };

  const gmail = await GmailApiClient.create(config);
  const messages = await gmail.listSpamMessages();

  expect(messages).toEqual([{ id: 'spam-1', subject: 'Spam subject' }]);
  expect(requests[1].url).toContain('labelIds=SPAM');
  expect(requests[1].init?.headers).toMatchObject({ authorization: 'Bearer access-token' });
});

test('emptySpam reports the number of messages and sends one batch delete', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });

    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
    }
    if (url.includes('/batchDelete')) {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify({ messages: [{ id: 'spam-1' }, { id: 'spam-2' }] }), { status: 200 });
  };

  const gmail = await GmailApiClient.create(config);
  const deleted = await gmail.emptySpam();

  expect(deleted).toBe(2);
  const batchDeleteRequest = requests.find(({ url }) => url.includes('/batchDelete'));
  expect(batchDeleteRequest?.init?.method).toBe('POST');
  expect(JSON.parse(String(batchDeleteRequest?.init?.body))).toEqual({ ids: ['spam-1', 'spam-2'] });
});