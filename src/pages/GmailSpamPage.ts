import { expect, type Locator, type Page } from '@playwright/test';
import { gmailText, spamUrl } from '../config';

/**
 * Page object for the Gmail Spam view.
 */
export class GmailSpamPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get emptySpamLink(): Locator {
    return this.page.getByRole('link', { name: gmailText.emptySpamLink });
  }

  get confirmButton(): Locator {
    return this.page.getByRole('button', { name: gmailText.confirmButton });
  }

  get selectAllCheckbox(): Locator {
    return this.page
      .getByRole('checkbox', { name: gmailText.selectAllCheckbox })
      .first();
  }

  get deleteForeverButton(): Locator {
    return this.page.getByRole('button', {
      name: gmailText.deleteForeverButton,
    });
  }

  get messageRows(): Locator {
    return this.page.locator('tr.zA');
  }

  async open(): Promise<void> {
    await this.page.goto(spamUrl(), { waitUntil: 'domcontentloaded' });
    await this.assertSignedIn();
    // The message list is rendered late; wait for the toolbar to settle.
    await this.page
      .getByRole('button', { name: /Refresh/i })
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async assertSignedIn(): Promise<void> {
    if (/accounts\.google\.com/.test(this.page.url())) {
      throw new Error(
        'Not signed in: Gmail redirected to the Google login page.',
      );
    }
    await expect(
      this.page.getByRole('button', { name: /Compose/i }).first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  async spamCount(): Promise<number> {
    return this.messageRows.count();
  }

  /**
   * Empties the spam folder. Prefers Gmail's "Delete all spam messages now"
   * shortcut and falls back to select-all + Delete forever.
   * @returns number of messages that were present before deleting.
   */
  async emptySpam(): Promise<number> {
    const before = await this.spamCount();
    if (before === 0) return 0;

    if (await this.emptySpamLink.isVisible().catch(() => false)) {
      await this.emptySpamLink.click();
    } else {
      await this.selectAllCheckbox.check();
      await this.deleteForeverButton.click();
    }

    // A confirmation dialog appears for bulk deletes; it is optional.
    if (await this.confirmButton.first().isVisible().catch(() => false)) {
      await this.confirmButton.first().click();
    }

    await expect(this.messageRows).toHaveCount(0, { timeout: 60_000 });
    return before;
  }
}
