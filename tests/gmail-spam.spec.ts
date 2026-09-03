import { expect, test } from '@playwright/test';
import {
  getGmailApiConfig,
  GmailApiClient,
  hasGmailApiCredentials,
} from '../src/gmail/GmailApiClient';

test.describe('Gmail Spam API', () => {
  test.skip(
    !hasGmailApiCredentials(),
    'Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to run Gmail API tests.',
  );


  test('number of spam messages for the authenticated account', async () => {
    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const spamMessageIds = await gmail.listSpamMessageIds();
    console.log(`Number of spam messages: ${spamMessageIds.length}`);
  });

  test('lists spam message subjects for the authenticated account', async () => {
    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const messages = await gmail.listSpamMessages();

    console.log(`Spam messages found: ${messages.length}`);
    for (const { id, subject } of messages) {
      console.log(`${id}: ${subject}`);
    }
  });

  test('permanently deletes spam messages when confirmed', async () => {
    test.skip(
      String(process.env.CONFIRM_DELETE).toLowerCase() !== 'true',
      'Dry run: set CONFIRM_DELETE=true to permanently delete spam.',
    );

    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const deleted = await gmail.emptySpam();
    await expect.poll(() => gmail.listSpamMessageIds()).toHaveLength(0);
    console.log(`Deleted ${deleted} spam message(s).`);
  });
});
