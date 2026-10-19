import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://school.moodledemo.net/login/index.php';
const USERNAME = 'student';
const PASSWORD = 'moodle26';

async function login(page) {
  await page.goto(LOGIN_URL);

  await page.locator('#username').fill(USERNAME);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#loginbtn').click();
}

test.describe('Responsive Design', () => {

  test('TC11 - Mobile Viewport', async ({ page }) => {

    await page.setViewportSize({
      width: 375,
      height: 667
    });

    await login(page);

    await expect(page).toHaveURL(/\/my\//);

    console.log(
      'TC11 PASSED: Mobile viewport validated');
  });

  test('TC12 - Tablet Viewport', async ({ page }) => {

    await page.setViewportSize({
      width: 768,
      height: 1024
    });

    await login(page);

    await expect(page).toHaveURL(/\/my\//);

    console.log(
      'TC12 PASSED: Tablet viewport validated');
  });

});