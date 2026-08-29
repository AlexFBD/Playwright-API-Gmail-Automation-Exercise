import { defineConfig } from 'cypress';
import 'dotenv/config';

export default defineConfig({
  e2e: {
    baseUrl: 'https://mail.google.com',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    // Gmail is heavily cross-origin and frame-hostile; these are required.
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true,
    defaultCommandTimeout: 30_000,
    pageLoadTimeout: 120_000,
    viewportWidth: 1440,
    viewportHeight: 900,
    video: false,
  },
  env: {
    GMAIL_USER_INDEX: process.env.GMAIL_USER_INDEX ?? '0',
    CONFIRM_DELETE: process.env.CONFIRM_DELETE ?? 'false',
  },
});
