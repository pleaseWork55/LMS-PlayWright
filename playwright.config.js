// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Global timeout per test — the remote demo site can be slow */
  timeout: 90_000,
  /* Run tests one by one, in order (no parallel execution within or across files) */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry a failed test once (the demo site occasionally returns 502s/timeouts) */
  retries: 1,
  /* Single worker: login (setup) projects run first, then chromium, firefox and webkit in turn. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Record a trace for every test (passed or failed). See https://playwright.dev/docs/trace-viewer */
    trace: 'on',

    /* Take a screenshot at the end of every test (passed or failed). */
    screenshot: 'on',
  },

  /* Configure projects for major browsers.
   * Each browser has a "setup-*" project that logs in once and saves the session to
   * playwright/.auth/<browser>.json; the browser project depends on it and reuses that
   * session via storageState. login.spec.js opts out and tests the real login flow. */
  projects: [
    {
      name: 'setup-chromium',
      testMatch: /.*\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-firefox',
      testMatch: /.*\.setup\.js/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'setup-webkit',
      testMatch: /.*\.setup\.js/,
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/chromium.json' },
      dependencies: ['setup-chromium'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/firefox.json' },
      dependencies: ['setup-firefox'],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/webkit.json' },
      dependencies: ['setup-webkit'],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

