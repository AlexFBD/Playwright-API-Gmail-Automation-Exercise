import { expect, test } from '@playwright/test';
import { GmailSpamPage } from '../src/pages/GmailSpamPage';
import { isDeleteConfirmed } from '../src/config';

test.describe('Gmail spam folder', () => {
  let spam: GmailSpamPage;

  test.beforeEach(async ({ page }) => {
    spam = new GmailSpamPage(page);
    await spam.open();
  });

  test('loads the spam folder while signed in', async ({ page }) => {
    await expect(page).toHaveURL(/#spam/);
    console.log(`Spam messages found: ${await spam.spamCount()}`);
  });

  test('empties the spam folder', async () => {
    test.skip(
      !isDeleteConfirmed(),
      'Dry run: set CONFIRM_DELETE=true to permanently delete spam.',
    );

    const deleted = await spam.emptySpam();
    console.log(`Deleted ${deleted} spam message(s).`);
    expect(await spam.spamCount()).toBe(0);
  });
});
