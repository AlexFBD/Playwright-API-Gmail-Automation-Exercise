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

test('creates a client with a refreshed token and lists Bin message IDs', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    if (String(input) === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
    }

    return new Response(JSON.stringify({ messages: [{ id: 'bin-1' }, { id: 'bin-2' }] }), {
      status: 200,
    });
  };

  const gmail = await GmailApiClient.create(config);
  const messageIds = await gmail.listTrashMessageIds();

  expect(messageIds).toEqual(['bin-1', 'bin-2']);
  expect(requests).toHaveLength(2);
  expect(requests[0].init?.method).toBe('POST');
  expect(String(requests[0].init?.body)).toContain('grant_type=refresh_token');
  expect(requests[1].url).toContain('labelIds=TRASH');
  expect(requests[1].init?.headers).toMatchObject({ authorization: 'Bearer access-token' });
});

test('lists Bin subjects and permanently deletes a selected message', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });

    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
    }
    if (url.includes('/messages/bin-1?')) {
      return new Response(JSON.stringify({ payload: { headers: [{ name: 'Subject', value: 'Deleted message' }] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ messages: [{ id: 'bin-1' }] }), { status: 200 });
  };

  const gmail = await GmailApiClient.create(config);
  const messages = await gmail.listTrashMessages(1);
  await gmail.deleteMessage('bin-1');

  expect(messages).toEqual([{ id: 'bin-1', subject: 'Deleted message' }]);
  const deleteRequest = requests.find(({ init }) => init?.method === 'DELETE');
  expect(deleteRequest?.url).toContain('/messages/bin-1');
});