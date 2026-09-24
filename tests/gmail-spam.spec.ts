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


  test('number of spam messages found for the authenticated account', async () => {
    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const spamMessageIds = await gmail.listSpamMessageIds();

    expect(spamMessageIds.every((id) => id.length > 0)).toBe(true);
    expect(new Set(spamMessageIds).size).toBe(spamMessageIds.length);
    console.log(`Number of spam messages: ${spamMessageIds.length}`);
  });

  test('lists spam message subjects for the authenticated account', async () => {
    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const messages = await gmail.listSpamMessages();

    expect(messages.every(({ id, subject }) => id.length > 0 && subject.length > 0)).toBe(true);
    expect(new Set(messages.map(({ id }) => id)).size).toBe(messages.length);
    console.log('Spam email subjects:');
    for (const { id, subject } of messages) {
      console.log(`${id}: ${subject}`);
    }
  });

  test('deletes the first spam message when confirmed', async () => {
    test.skip(
      String(process.env.CONFIRM_DELETE_SPAM_FIRST).toLowerCase() !== 'true',
      'Set CONFIRM_DELETE_SPAM_FIRST=true to permanently delete the first spam message.',
    );

    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const [firstMessage] = await gmail.listSpamMessages();
    test.skip(!firstMessage, 'No spam messages are available to delete.');

    console.log(`First spam message: ${firstMessage.id}: ${firstMessage.subject}`);
    await gmail.deleteMessage(firstMessage.id);
    await expect
      .poll(async () => (await gmail.listSpamMessageIds()).includes(firstMessage.id))
      .toBe(false);
    console.log('spam message deleted');
  });

  test('permanently deletes all spam messages when confirmed', async () => {
    test.skip(
      String(process.env.CONFIRM_DELETE_SPAM_ALL).toLowerCase() !== 'true',
      'Dry run: set CONFIRM_DELETE_SPAM_ALL=true to permanently delete all spam.',
    );

    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const deleted = await gmail.emptySpam();
    await expect.poll(() => gmail.listSpamMessageIds()).toHaveLength(0);
    console.log(`Deleted ${deleted} spam message(s).`);
  });
});
