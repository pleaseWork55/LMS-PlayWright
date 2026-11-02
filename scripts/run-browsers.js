// Runs the suite one browser at a time (chromium -> firefox -> webkit) and saves a
// separate HTML report for each one in playwright-report/<browser>/.
// Each browser project depends on its own login "setup-<browser>" project, so login runs first.
//
// Usage:
//   node scripts/run-browsers.js                 # all three browsers
//   node scripts/run-browsers.js firefox webkit  # only the browsers you list
//   node scripts/run-browsers.js chromium -g "Login"   # extra args go to playwright
const { spawnSync } = require('child_process');
const path = require('path');

const ALL = ['chromium', 'firefox', 'webkit'];
const args = process.argv.slice(2);
const browsers = args.filter((a) => ALL.includes(a));
const extra = args.filter((a) => !ALL.includes(a));
const toRun = browsers.length ? browsers : ALL;

const cli = require.resolve('@playwright/test/cli');
let failed = [];

for (const browser of toRun) {
  const reportDir = path.join('playwright-report', browser);
  console.log(`\n===== ${browser}: report -> ${reportDir} =====\n`);

  const result = spawnSync(
    process.execPath,
    [cli, 'test', `--project=${browser}`, ...extra],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_OUTPUT_DIR: reportDir,
        PLAYWRIGHT_HTML_OPEN: 'never', // don't block waiting on the report server
      },
    }
  );

  if (result.status !== 0) failed.push(browser);
}

console.log('\n===== Done =====');
for (const browser of toRun) {
  const status = failed.includes(browser) ? 'FAILED' : 'passed';
  console.log(`${browser.padEnd(9)} ${status.padEnd(7)} npx playwright show-report playwright-report/${browser}`);
}

process.exit(failed.length ? 1 : 0);
