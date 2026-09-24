import { expect, test } from '@playwright/test';
import {
  getGmailApiConfig,
  GmailApiClient,
  hasGmailApiCredentials,
} from '../src/gmail/GmailApiClient';

test.describe('Gmail Bin API', () => {
  test.skip(
    !hasGmailApiCredentials(),
    'Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to run Gmail API tests.',
  );

  test('retrieves the number of deleted emails in the Bin folder', async () => {
    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const deletedMessageIds = await gmail.listTrashMessageIds();

    expect(deletedMessageIds.every((id) => id.length > 0)).toBe(true);
    expect(new Set(deletedMessageIds).size).toBe(deletedMessageIds.length);
    console.log(`Number of deleted emails in Bin: ${deletedMessageIds.length}`);
  });

  test('lists the first 30 emails in the Bin folder', async () => {
    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const messages = await gmail.listTrashMessages(30);

    expect(messages.length).toBeLessThanOrEqual(30);
    expect(messages.every(({ id, subject }) => id.length > 0 && subject.length > 0)).toBe(true);
    expect(new Set(messages.map(({ id }) => id)).size).toBe(messages.length);
    console.log(`First ${messages.length} emails in Bin:`);
    for (const { id, subject } of messages) {
      console.log(`${id}: ${subject}`);
    }
  });

  test('permanently deletes the first email in the Bin folder when confirmed', async () => {
    test.skip(
      String(process.env.CONFIRM_DELETE_BIN_FIRST).toLowerCase() !== 'true',
      'Set CONFIRM_DELETE_BIN_FIRST=true to permanently delete the first Bin email.',
    );

    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const [firstMessage] = await gmail.listTrashMessages(1);
    test.skip(!firstMessage, 'No emails are available in the Bin.');

    console.log(`First Bin email: ${firstMessage.id}: ${firstMessage.subject}`);
    await gmail.deleteMessage(firstMessage.id);
    await expect
      .poll(async () => (await gmail.listTrashMessageIds()).includes(firstMessage.id))
      .toBe(false);
    console.log('Bin email deleted');
  });

  test('permanently deletes all emails in the Bin folder', async () => {
    test.skip(
      String(process.env.CONFIRM_DELETE_BIN_ALL).toLowerCase() !== 'true',
      'Set CONFIRM_DELETE_BIN_ALL=true to permanently delete all Bin emails.',
    );

    const gmail = await GmailApiClient.create(getGmailApiConfig());
    const deleted = await gmail.emptyTrash();
    await expect.poll(() => gmail.listTrashMessageIds()).toHaveLength(0);
    console.log(`Permanently deleted ${deleted} emails from the Bin.`);
  });
});
