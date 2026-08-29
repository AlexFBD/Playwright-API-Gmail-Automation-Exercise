export const GMAIL_ORIGIN = 'https://mail.google.com';

export const userIndex = (): string => process.env.GMAIL_USER_INDEX ?? '0';

export const spamUrl = (): string =>
  `${GMAIL_ORIGIN}/mail/u/${userIndex()}/#spam`;

export const isDeleteConfirmed = (): boolean =>
  String(process.env.CONFIRM_DELETE).toLowerCase() === 'true';

/**
 * Gmail ships obfuscated class names that change without notice, so every
 * selector here is text/aria based. Update the text if the UI copy changes.
 */
export const gmailText = {
  emptySpamLink: /Delete all spam messages now/i,
  confirmButton: /^(OK|Delete)$/,
  deleteForeverButton: /Delete forever/i,
  emptyState: /(No new mail|no messages|Hooray)/i,
  selectAllCheckbox: 'Select',
} as const;
