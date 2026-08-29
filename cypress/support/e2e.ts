/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /** Opens the Gmail Spam folder. */
      visitSpam(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('visitSpam', () => {
  const index = Cypress.env('GMAIL_USER_INDEX') ?? '0';
  cy.visit(`/mail/u/${index}/#spam`);
  cy.contains('Compose', { timeout: 60_000 }).should('be.visible');
});

// Gmail throws noisy async errors that are unrelated to the assertions.
Cypress.on('uncaught:exception', () => false);

export {};
