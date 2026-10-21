import { test, expect } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

const BASE_URL = 'https://school.moodledemo.net';

test.describe('Profile & Account', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('View own profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/profile.php`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/user\/profile\.php/);

    // Profile heading shows the user's name
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('');

    // Profile sections are rendered
    await expect(page.locator('.userprofile, #region-main').first()).toContainText(
      /user details|email address|course details/i
    );
  });

  test('Edit profile details', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/edit.php`, { waitUntil: 'domcontentloaded' });

    const city = page.locator('#id_city');
    await expect(city).toBeVisible();

    const newCity = `TestCity${Date.now() % 10000}`;
    await city.fill(newCity);
    await page.locator('#id_submitbutton').click();

    // Saved -> redirected to the profile, where the new value is shown
        // Saved -> Moodle redirects to the preferences page (or the profile, depending on version)
    await expect(page).toHaveURL(/\/user\/(preferences|profile)\.php/);

    // Verify the new value on the profile page
    await page.goto(`${BASE_URL}/user/profile.php`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#region-main')).toContainText(newCity);
  });
});