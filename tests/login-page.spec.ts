import { expect, test } from '@playwright/test';

const testEmail = 'test@example.com';

//////////////////////
// Happy Path Tests //
//////////////////////

test('Gmail login page shows "Sign in"', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(2000);

  var signInText = await page.getByText('Sign in', { exact: true }).first();

  console.log( "Login Page text: " + await signInText.textContent());

  expect(await signInText.textContent()).toBe('Sign in');

});

test('Gmail login can type in email address', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByLabel('Email or phone').fill(testEmail);

  await page.waitForTimeout(2000);
  
  expect(await page.getByLabel('Email or phone').inputValue()).toBe(testEmail);

});

test('Gmail login page contains "Gmail"', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  const continueToGmail = page.getByText(/to continue to Gmail/i).first();

  await page.waitForTimeout(2000);

  await expect(continueToGmail).toContainText('Gmail');
});

test('Gmail login displays "Find your email" after selecting "Forgot email?"', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByText('Forgot email?', { exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Find your email' })).toBeVisible();

  await page.waitForTimeout(2000);
});

/////////////////////////
// Negative Path Tests //
/////////////////////////

test('Gmail login displays an email or phone number error after pressing Next with an empty field', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Enter an email or phone number', { exact: true })).toBeVisible();
});

test('Gmail login displays "couldn\'t sign you in" after pressing the \'Next\' button.', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByLabel('Email or phone').fill(testEmail);
 
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'Next' }).click();

  await page.waitForTimeout(2000);

  await expect(page.getByRole('heading', { name: /Couldn[’']t sign you in/i })).toBeVisible();
});
