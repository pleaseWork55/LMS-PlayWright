// @ts-check
// Logs in ONCE per browser and saves the session (cookies/storage) to
// playwright/.auth/<browser>.json. All other specs (except login.spec.js)
// reuse that file via `storageState` in playwright.config.js, so they start
// already authenticated and never repeat the login flow.
import { test as setup } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

setup('authenticate as student', async ({ page, browserName }) => {
  await loginAsStudent(page);
  await page.context().storageState({ path: `playwright/.auth/${browserName}.json` });
});
