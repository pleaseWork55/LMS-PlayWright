// @ts-check
import { expect } from '@playwright/test';

const LOGIN_URL =
  'https://school.moodledemo.net/login/index.php';

const USERNAME = 'student';
const PASSWORD = 'moodle26';

const TIMEOUT = 60_000;

export async function loginAsStudent(page) {
  await page.goto(LOGIN_URL, {
    waitUntil: 'domcontentloaded'
  });

  await expect(
    page.locator('#username')
  ).toBeVisible({
    timeout: TIMEOUT
  });

  await page.locator('#username').fill(USERNAME);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#loginbtn').click();

  await expect(page).toHaveURL(/\/my\//, {
    timeout: TIMEOUT
  });

  await expect(
    page.locator('h1')
  ).toContainText('Dashboard', {
    timeout: TIMEOUT
  });
}