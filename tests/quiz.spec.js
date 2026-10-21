// tests/quiz.spec.js
// M3 – Quiz (TC07 – TC08)
//
// Flow per test:
//   1. Login                          (helpers/auth.js)
//   2. Open My Courses, click first enrolled course  → /course/view.php?id=XX
//   3. Go to Course Overview                         → /course/overview.php?id=XX
//   4. Expand the "Quizzes" section                  → #quiz_overview
//   5. Open first quiz                               → /mod/quiz/view.php?id=YYY
//   6a. [TC07] Attempt → answer Q1 → verify answer kept
//   6b. [TC08] Attempt → answer all → finish → submit → verify result page

import { test, expect } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

const BASE_URL = 'https://school.moodledemo.net';
const TIMEOUT = 60_000; // same generous timeout as auth.js (demo site can be slow)

// ───────────────────────── helpers (page-object style, kept local) ─────────────────────────

/** Steps 3-5: course page → overview → expand Quizzes → open first quiz. Returns quiz title. */
async function navigateToFirstQuizViaOverview(page) {
  // Derive course id from the current /course/view.php?id=XX URL
  await page.waitForURL(/\/course\/view\.php\?id=\d+/);
  const courseId = new URL(page.url()).searchParams.get('id');

  await page.goto(`${BASE_URL}/course/overview.php?id=${courseId}`, {
    waitUntil: 'domcontentloaded',
  });

  // Expand the "Quizzes" section.
  // The overview page binds its collapse handlers via JS after load, so a click that
  // lands too early does nothing. Retry "click if still collapsed" until the panel opens.
  await page.waitForLoadState('load');
  const panel = page.locator('#quiz_overview');
  const toggle = page
    .locator('a[href="#quiz_overview"], [aria-controls="quiz_overview"], #quiz_overview_collapsible a')
    .first();
  await toggle.waitFor({ state: 'visible' });

  try {
    await expect(async () => {
      if (!(await panel.isVisible())) {
        await toggle.click();
      }
      await expect(panel).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000] });
  } catch (e) {
    // Debug aid: show what the toggle area really looks like
    const html = await page.locator('#quiz_overview_collapsible').evaluate((el) => el.outerHTML).catch(() => 'n/a');
    console.log('QUIZ TOGGLE HTML >>>', html);
    throw e;
  }

  // Collect quiz links and open the first one
  const firstQuizLink = panel.locator('a.activityname').first();
  await expect(firstQuizLink).toBeVisible();
  const quizTitle = (await firstQuizLink.innerText()).trim();
  await firstQuizLink.click();

  await page.waitForURL(/\/mod\/quiz\/view\.php/);
  return quizTitle;
}

/** Click "Attempt quiz" / "Re-attempt" / "Continue your attempt" (+ confirm modal if shown). */
async function clickAttemptQuiz(page) {
  await page
    .getByRole('button', { name: /attempt quiz|re-attempt quiz|continue your attempt/i })
    .first()
    .click();

  // Some quizzes show a "Start attempt" confirmation modal (time limit / password)
  const startBtn = page.locator('.modal-dialog input[value="Start attempt"], .modal-dialog button:has-text("Start attempt")');
  if (await startBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await startBtn.first().click();
  }
}

const isOnAttemptPage = (page) => /\/mod\/quiz\/attempt\.php/.test(page.url());

/** Select first radio/checkbox on the first question. Returns the locator, or null (e.g. essay). */
async function selectFirstAnswer(page) {
  const input = page
    .locator('.que .answer input[type="radio"], .que .answer input[type="checkbox"]')
    .first();
  if ((await input.count()) === 0) return null;
  await input.check();
  return input;
}

/** Answer the first option on every question page until the last page. */
async function answerAllRemainingQuestions(page) {
  while (true) {
    // Answer every question on the current page
    const questions = page.locator('.que');
    const qCount = await questions.count();
    for (let i = 0; i < qCount; i++) {
      const input = questions
        .nth(i)
        .locator('.answer input[type="radio"], .answer input[type="checkbox"]')
        .first();
      if ((await input.count()) > 0) await input.check();
    }

    // The "Next page" button also exists on the LAST page, where it reads
    // "Finish attempt ..." and leads to summary.php instead of another attempt page.
    const next = page.locator('input[name="next"]');
    if ((await next.count()) === 0) break;

    const before = page.url();
    await next.click();
    await page.waitForURL((url) => url.href !== before);
    if (/\/mod\/quiz\/summary\.php/.test(page.url())) break; // reached summary
  }
}

/** Last attempt page → summary page. */
async function clickFinishAttempt(page) {
  // answerAllRemainingQuestions() may already have landed on the summary page
  if (/\/mod\/quiz\/summary\.php/.test(page.url())) return;

  // Moodle shows either a "Finish attempt ..." link or a "Next page" → summary submit
  const finish = page.getByRole('link', { name: /finish attempt/i });
  if (await finish.count()) {
    await finish.first().click();
  } else {
    await page.locator('input[name="next"]').click();
  }
  await page.waitForURL(/\/mod\/quiz\/summary\.php/);
}

/** Summary page → "Submit all and finish" → confirm modal → result page. */
async function submitAllAndFinish(page) {
  await page.getByRole('button', { name: /submit all and finish/i }).click();

  const confirm = page.locator('.modal-dialog').getByRole('button', { name: /submit all and finish/i });
  await confirm.waitFor({ state: 'visible' });
  await confirm.click();

  await page.waitForURL(/\/mod\/quiz\/(review|view)\.php/);
}

const isOnResultPage = (page) => /\/mod\/quiz\/(review|view)\.php/.test(page.url());

const getResultPageHeading = async (page) =>
  (await page.locator('h1, h2').first().innerText()).trim();

/** Rows of the grade/summary table on the review page (may be empty). */
async function getResultSummaryRows(page) {
  const rows = page.locator('table.generaltable.generalbox.quizreviewsummary tr');
  const texts = await rows.allInnerTexts();
  return texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// ───────────────────────────────────── tests ─────────────────────────────────────

test.describe('M3 – Quiz', () => {
  test.setTimeout(3 * TIMEOUT); // multi-page flow: login + overview + attempt + submit

  // Steps 1-2 shared by every test: Login → My Courses → first course
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page); // Step 1 – Login
    console.log('QuizTests beforeEach – login successful');

    await page.goto(`${BASE_URL}/my/courses.php`, { waitUntil: 'domcontentloaded' }); // Step 2 – My Courses
    console.log('QuizTests beforeEach – my courses page opened');

    // Open first enrolled course → /course/view.php?id=XX
    await page.locator('a[href*="/course/view.php?id="]').first().click();
    await page.waitForURL(/\/course\/view\.php\?id=\d+/);
    console.log('QuizTests beforeEach – course page ready:', page.url());
  });

  /**
   * TC07 - Start a quiz attempt
   * Expected: quiz title shown, attempt starts (/mod/quiz/attempt.php),
   *           first answer selection persists.
   */
  test('TC07 - Start a quiz attempt', async ({ page }) => {
    const quizTitle = await navigateToFirstQuizViaOverview(page);
    expect(quizTitle, 'Quiz title should not be empty on the intro page').not.toBe('');
    console.log('TC07 – quiz found:', quizTitle);

    await clickAttemptQuiz(page);
    await expect(page, 'After "Attempt quiz" URL should contain /mod/quiz/attempt.php')
      .toHaveURL(/\/mod\/quiz\/attempt\.php/);
    expect(isOnAttemptPage(page)).toBe(true);

    const answer = await selectFirstAnswer(page);
    if (answer) {
      await expect(answer, 'The chosen answer should remain selected').toBeChecked();
      console.log('TC07 – first answer selected and confirmed ✓');
    } else {
      console.log('TC07 – no radio/checkbox on Q1 (e.g. essay); selection check skipped');
    }
  });

  /**
   * TC08 - Submit quiz and see the result
   * Expected: all pages answered, summary page reached, quiz submitted,
   *           result/review page shown with a non-empty heading.
   */
  test('TC08 - Submit quiz and see the result', async ({ page }) => {
    const quizTitle = await navigateToFirstQuizViaOverview(page);
    console.log('TC08 – quiz found:', quizTitle);

    await clickAttemptQuiz(page);
    await expect(page).toHaveURL(/\/mod\/quiz\/attempt\.php/);
    console.log('TC08 – attempt page opened');

    await answerAllRemainingQuestions(page);
    console.log('TC08 – all questions answered');

    await clickFinishAttempt(page);
    console.log('TC08 – finished attempt, now on summary page');

    await submitAllAndFinish(page);
    console.log('TC08 – submission completed');

    expect(
      isOnResultPage(page),
      `After submission URL should contain /mod/quiz/review.php or /mod/quiz/view.php but was: ${page.url()}`
    ).toBe(true);

    const heading = await getResultPageHeading(page);
    expect(heading, 'Result page should display a non-empty heading').not.toBe('');
    console.log('TC08 – result page heading:', heading);

    const summaryRows = await getResultSummaryRows(page);
    if (summaryRows.length) {
      console.log('TC08 – result summary rows found:');
      summaryRows.forEach((r) => console.log('       •', r));
    } else {
      console.log('TC08 – no grade rows visible; result page presence check is sufficient ✓');
    }
  });

    // Quiz info shown before starting
  test('Quiz info shown before starting', async ({ page }) => {
    const quizTitle = await navigateToFirstQuizViaOverview(page);
    expect(quizTitle).not.toBe('');

    await expect(page).toHaveURL(/\/mod\/quiz\/view\.php/);

    // Quiz name heading is displayed
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('h1').first()).not.toHaveText('');

    // Intro page shows quiz details (attempts allowed / time limit / grading method / open-close dates)
    await expect(page.locator('#region-main')).toContainText(
      /attempts allowed|time limit|grading method|grade to pass|opened|closes|closed/i
    );

    // A start/continue button is available, but we do NOT click it
    await expect(
      page.getByRole('button', { name: /attempt quiz|re-attempt quiz|continue your attempt/i }).first()
    ).toBeVisible();
  });

  // Review a finished quiz attempt
  test('Review a finished quiz attempt', async ({ page }) => {
    await navigateToFirstQuizViaOverview(page);

    const reviewLink = page.locator('a[href*="/mod/quiz/review.php"]').first();

    // No finished attempt yet? Make one (reuses the TC08 flow)
    if ((await reviewLink.count()) === 0) {
      await clickAttemptQuiz(page);
      await answerAllRemainingQuestions(page);
      await clickFinishAttempt(page);
      await submitAllAndFinish(page);
    }

    // submitAllAndFinish may already land on review.php; otherwise click the Review link
    if (!/\/mod\/quiz\/review\.php/.test(page.url())) {
      await reviewLink.click();
    }

    await expect(page).toHaveURL(/\/mod\/quiz\/review\.php/);
    await expect(page.locator('.quizreviewsummary')).toContainText(/finished/i);
    await expect(page.locator('.que').first()).toBeVisible();
  });
});