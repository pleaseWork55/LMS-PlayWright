import { test, expect } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

const BASE_URL = 'https://school.moodledemo.net';

test.describe('Calendar & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('Main navigation links work', async ({ page }) => {
    const nav = page.locator('.primary-navigation');

    // My courses
    await nav.locator('a[href*="/my/courses.php"]').first().click();
    await expect(page).toHaveURL(/\/my\/courses\.php/);

    // Dashboard
    await nav.locator('a[href$="/my/"]').first().click();
    await expect(page).toHaveURL(/\/my\/?$/);
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Home
    await nav.locator('a[href*="redirect=0"], a[href$="school.moodledemo.net/"]').first().click();
    await expect(page).toHaveURL(/school\.moodledemo\.net\/(\?redirect=0)?$/);
  });

  test('Calendar page shows current month', async ({ page }) => {
    await page.goto(`${BASE_URL}/calendar/view.php?view=month`, { waitUntil: 'domcontentloaded' });

    // e.g. "October 2026"
    const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    await expect(page).toHaveURL(/\/calendar\/view\.php/);
    await expect(
      page.locator('.calendarwrapper, [data-region="calendar"]').first()
    ).toContainText(monthYear);
  });
});