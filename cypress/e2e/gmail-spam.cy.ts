/// <reference types="cypress" />

describe('Gmail spam folder', () => {
  beforeEach(() => {
    cy.visitSpam();
  });

  it('loads the spam folder while signed in', () => {
    cy.url().should('include', '#spam');
    cy.get('body').then(($body) => {
      cy.log(`Spam messages found: ${$body.find('tr.zA').length}`);
    });
  });

  it('empties the spam folder', function () {
    if (String(Cypress.env('CONFIRM_DELETE')).toLowerCase() !== 'true') {
      cy.log('Dry run: set CONFIRM_DELETE=true to permanently delete spam.');
      this.skip();
    }

    cy.get('body').then(($body) => {
      if ($body.find('tr.zA').length === 0) {
        cy.log('Spam folder is already empty.');
        return;
      }

      if ($body.text().includes('Delete all spam messages now')) {
        cy.contains('a', 'Delete all spam messages now').click();
      } else {
        cy.get('[role="checkbox"][aria-label*="Select"]').first().click();
        cy.contains('[role="button"]', 'Delete forever').click();
      }

      cy.contains('button, [role="button"]', /^(OK|Delete)$/)
        .filter(':visible')
        .first()
        .click({ force: true });
    });

    cy.get('tr.zA', { timeout: 60_000 }).should('have.length', 0);
  });
});
