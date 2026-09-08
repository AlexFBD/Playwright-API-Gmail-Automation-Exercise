import { expect, test } from '@playwright/test';

test('Gmail login page shows "Sign in"', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(3000);

  var signInText = await page.getByText('Sign in', { exact: true }).first();

  console.log( "Login Page text: " + await signInText.textContent());

  expect(await signInText.textContent()).toBe('Sign in');

});

test('Gmail login type in email address', async ({ page }) => {
  await page.goto('https://accounts.google.com/ServiceLogin?service=mail', {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(2000);

  await page.getByLabel('Email or phone').fill('test@example.com');

  await page.waitForTimeout(2000);
  
  expect(await page.getByLabel('Email or phone').inputValue()).toBe('test@example.com');

});
