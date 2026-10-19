// @ts-check
import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://school.moodledemo.net/login/index.php';
const USERNAME = 'student';
const PASSWORD = 'moodle26';

// Remote demo site can be slow — give cross-browser assertions more headroom.
const TIMEOUT = 60_000;

/**
 * Navigate to the login page and wait until the username field is ready.
 */
async function openLoginPage(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#username')).toBeVisible({ timeout: TIMEOUT });
}

/**
 * Fill in credentials and click Log in.
 */
async function login(page, username, password) {
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#loginbtn').click();
}

test.describe('Login', () => {

  // ─── TC01 ─────────────────────────────────────────────────────────────────
  test('TC01 - Valid student login', async ({ page }) => {
    await openLoginPage(page);
    await login(page, USERNAME, PASSWORD);

    // Student lands on the Dashboard
    await expect(page).toHaveURL(/\/my\//, { timeout: TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toContainText('Dashboard', { timeout: TIMEOUT });

    // User menu toggle is visible and shows the student's first name
    const toggle = page.locator('#user-menu-toggle');
    await expect(toggle).toBeVisible({ timeout: TIMEOUT });

    // The site displays the student's first name next to the avatar
    const firstName = page.locator('.userfirstname');
    await expect(firstName).toBeVisible({ timeout: TIMEOUT });
    const name = await firstName.innerText();
    expect(name.trim()).not.toBe('');
  });

  // ─── TC02 ─────────────────────────────────────────────────────────────────
  test('TC02 - Invalid password', async ({ page }) => {
    await openLoginPage(page);
    await login(page, USERNAME, 'wrongPassword123');

    // Error message is shown and user stays on the login page
    const errorBanner = page.locator('#loginerrormessage');
    await expect(errorBanner).toBeVisible({ timeout: TIMEOUT });
    await expect(errorBanner).toContainText(/unable to log in|invalid login/i);

    await expect(page).toHaveURL(/\/login\/index\.php/);
    // Login form is still present
    await expect(page.locator('#loginbtn')).toBeVisible();
  });

  // ─── TC03 ─────────────────────────────────────────────────────────────────
  test('TC03 - Logout', async ({ page }) => {
    await openLoginPage(page);
    await login(page, USERNAME, PASSWORD);
    await expect(page).toHaveURL(/\/my\//, { timeout: TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    // Open the user menu
    await page.locator('#user-menu-toggle').click({ timeout: TIMEOUT });

    // Retrieve the logout URL from the DOM (it includes a one-time sesskey),
    // then navigate to it directly — this is robust across all browsers because
    // Bootstrap's dropdown CSS hiding blocks programmatic clicks in Firefox/WebKit.
    const logoutHref = await page
      .locator('a[href*="/login/logout.php"]')
      .first()
      .getAttribute('href', { timeout: TIMEOUT });

    // Moodle's logout endpoint redirects; Chromium sometimes reports ERR_ABORTED
    // during the redirect chain, so we swallow navigation errors and just wait
    // for the URL to change away from /my/.
    await page.goto(/** @type {string} */ (logoutHref)).catch(() => { /* redirect abort is expected */ });

    // User is redirected away from the dashboard
    await expect(page).not.toHaveURL(/\/my\//, { timeout: TIMEOUT });

    // The Log in link is shown — user is no longer authenticated
    await expect(
      page.getByRole('link', { name: /^Log in$/i }).or(page.locator('#loginbtn'))
    ).toBeVisible({ timeout: TIMEOUT });

    // The authenticated user menu is gone
    await expect(page.locator('#user-menu-toggle')).toHaveCount(0);
  });

});
