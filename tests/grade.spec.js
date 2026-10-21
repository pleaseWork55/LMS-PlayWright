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
    await await expect(page).toHaveTitle(/grades/i);
    await expect(page.locator('table.generaltable, #overview-grade').first()).toBeVisible();
  });

    test('Course grade report opens', async ({ page }) => {
    await page.goto(`${BASE_URL}/grade/report/overview/index.php`, { waitUntil: 'domcontentloaded' });

    // Course links in the overview table point to /course/user.php?mode=grade
    const firstCourseLink = page.locator('a[href*="/course/user.php?mode=grade"]').first();
    await expect(firstCourseLink).toBeVisible();
    await firstCourseLink.click();

    // Depending on the Moodle version this stays on course/user.php or redirects to the user report
    await expect(page).toHaveURL(/\/(course\/user\.php|grade\/report\/user\/index\.php)/);

    // The course's grade report is shown (grade table with the grade item columns)
    await expect(page.locator('#region-main')).toContainText(/grade item|grade/i);
    await expect(page.locator('table').first()).toBeVisible();
  });
});