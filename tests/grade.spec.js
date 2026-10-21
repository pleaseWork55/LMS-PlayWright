import { test, expect } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

const BASE_URL = 'https://school.moodledemo.net';

test.describe('Grades', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('Grades overview opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/grade/report/overview/index.php`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/grade\/report\/overview\/index\.php/);
    await expect(page.locator('h1, h2').first()).toContainText(/grades/i);
    await expect(page.locator('table.generaltable, #overview-grade').first()).toBeVisible();
  });

  test('Course grade report opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/grade/report/overview/index.php`, { waitUntil: 'domcontentloaded' });

    // Click the first course in the overview table
    await page.locator('a[href*="/grade/report/user/index.php"]').first().click();

    await expect(page).toHaveURL(/\/grade\/report\/user\/index\.php/);
    await expect(
      page.locator('table.user-grade, .user-report-container').first()
    ).toBeVisible();
  });
});