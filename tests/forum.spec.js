// @ts-check
import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://school.moodledemo.net/login/index.php';
const FORUM_URL = 'https://school.moodledemo.net/mod/forum/view.php?id=706'; // Psychology in Cinema > Course discussion
const USERNAME = 'student';
const PASSWORD = 'moodle26';

// Remote demo site can be slow — give assertions more headroom.
const TIMEOUT = 60_000;

/**
 * Log in as the student and wait for the Dashboard.
 */
async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#username')).toBeVisible({ timeout: TIMEOUT });
  await page.locator('#username').fill(USERNAME);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#loginbtn').click();
  await expect(page).toHaveURL(/\/my\//, { timeout: TIMEOUT });
}

/**
 * Open the forum and wait until the "Add discussion topic" button is ready.
 */
async function openForum(page) {
  await page.goto(FORUM_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a:has-text("Add discussion topic")').first())
    .toBeVisible({ timeout: TIMEOUT });
}

/**
 * Create a new discussion topic in the forum.
 */
async function createPost(page, subject, message) {
  await openForum(page);

  // The link toggles an inline form via JavaScript; on slower browsers the first
  // click can land before the script is attached, so retry until the form shows.
  await expect(async () => {
    await page.locator('a:has-text("Add discussion topic")').first().click();
    await expect(page.locator('#id_subject')).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: TIMEOUT });

  await page.locator('#id_subject').fill(subject);
  // The message field is a TinyMCE editor rendered inside an iframe
  const editor = page.frameLocator('iframe[id^="id_message"]').locator('body');
  await expect(editor).toBeVisible({ timeout: TIMEOUT });
  // TinyMCE may still be initialising, so retry until the text is really in the editor
  await expect(async () => {
    await editor.fill(message);
    await expect(editor).toContainText(message, { timeout: 3_000 });
  }).toPass({ timeout: TIMEOUT });

  // Ensure TinyMCE synchronizes the editor content to Moodle's hidden textarea before form submission
  await editor.blur();
  await page.locator('#id_subject').click();

  await page.locator('#id_submitbutton').click();

  // Moodle confirms the post with an alert and returns to the forum
  await expect(page.locator('.alert').filter({ hasText: 'Post added' }).first())
    .toBeVisible({ timeout: TIMEOUT });
}

/**
 * Open a discussion from the forum list by its subject.
 */
async function openDiscussion(page, subject) {
  await openForum(page);
  await page.locator('a', { hasText: subject }).first().click();
  await expect(page).toHaveURL(/\/mod\/forum\/discuss\.php/, { timeout: TIMEOUT });
}

test.describe('Forum', () => {

  // ─── TC09 ─────────────────────────────────────────────────────────────────
  test('TC09 - Create a forum post', async ({ page }) => {
    const stamp = Date.now();
    const subject = `Automation post ${stamp}`;
    const message = `This post was created by Playwright automation (${stamp}).`;

    await login(page);
    await createPost(page, subject, message);

    // The new discussion is listed in the forum
    await openForum(page);
    await expect(page.locator('a', { hasText: subject }).first())
      .toBeVisible({ timeout: TIMEOUT });

    // Opening it shows the subject and the message body
    await openDiscussion(page, subject);
    await expect(page.locator('h3', { hasText: subject }).first())
      .toBeVisible({ timeout: TIMEOUT });
    await expect(page.getByText(message)).toBeVisible({ timeout: TIMEOUT });
  });

  // ─── TC10 ─────────────────────────────────────────────────────────────────
  test('TC10 - Reply to a forum post', async ({ page }) => {
    const stamp = Date.now();
    const subject = `Automation reply thread ${stamp}`;
    const message = `Original post for reply test (${stamp}).`;
    const reply = `This reply was added by Playwright automation (${stamp}).`;

    await login(page);
    // Create our own post so the test does not depend on pre-existing data
    await createPost(page, subject, message);
    await openDiscussion(page, subject);

    // Click Reply on the post. Normally this opens an inline reply box, but if the
    // click lands before the page JavaScript attaches (seen in Firefox) the link
    // navigates to the full-page reply form instead — handle both.
    const inlineBox = page.locator('textarea[name="post"]');
    const fullFormSubmit = page.locator('#id_submitbutton');
    await page.locator('a[data-region="post-action"]', { hasText: 'Reply' }).first().click();
    await expect(inlineBox.or(fullFormSubmit)).toBeVisible({ timeout: TIMEOUT });

    if (await inlineBox.isVisible()) {
      await inlineBox.fill(reply);
      await page.locator('button[data-action="forum-inpage-submit"]').click();
    } else {
      const editor = page.frameLocator('iframe[id^="id_message"]').locator('body');
      await expect(editor).toBeVisible({ timeout: TIMEOUT });
      await expect(async () => {
        await editor.fill(reply);
        await expect(editor).toContainText(reply, { timeout: 3_000 });
      }).toPass({ timeout: TIMEOUT });
      await editor.blur();
      await fullFormSubmit.click();
    }

    // Wait for the reply to appear on the current page first
    // (This ensures the post/reply has been successfully saved to the backend
    // before we navigate away, avoiding race conditions/cancelled POST requests)
    await expect(page.getByText(reply)).toBeVisible({ timeout: TIMEOUT });

    // Re-verify that the reply is displayed and persistent by navigating back to the discussion thread
    await openDiscussion(page, subject);
    await expect(page.getByText(reply)).toBeVisible({ timeout: TIMEOUT });
  });

  // ─── TC11 ─────────────────────────────────────────────────────────────────
  test('TC11 - Edit own forum post', async ({ page }) => {
    const stamp = Date.now();
    const subject = `Automation edit thread ${stamp}`;
    const message = `Original message before edit (${stamp}).`;
    const newSubject = `${subject} EDITED`;
    const newMessage = `Message updated by Playwright automation (${stamp}).`;

    await login(page);
    await createPost(page, subject, message);
    await openDiscussion(page, subject);

    // Open the edit form for our own post
    await page.locator('a[href*="post.php?edit="]').first().click();
    await expect(page.locator('#id_subject')).toBeVisible({ timeout: TIMEOUT });

    // Change subject and message
    await page.locator('#id_subject').fill(newSubject);
    const editor = page.frameLocator('iframe[id^="id_message"]').locator('body');
    await expect(editor).toBeVisible({ timeout: TIMEOUT });
    await expect(async () => {
      await editor.fill(newMessage);
      await expect(editor).toContainText(newMessage, { timeout: 3_000 });
    }).toPass({ timeout: TIMEOUT });
    await editor.blur();
    await page.locator('#id_subject').click();
    await page.locator('#id_submitbutton').click();

    // Updated content is displayed on the discussion page
    await expect(page).toHaveURL(/\/mod\/forum\/discuss\.php/, { timeout: TIMEOUT });
    await expect(page.locator('h3', { hasText: newSubject }).first())
      .toBeVisible({ timeout: TIMEOUT });
    await expect(page.getByText(newMessage)).toBeVisible({ timeout: TIMEOUT });
    await expect(page.getByText(message)).toHaveCount(0);
  });

  // ─── TC12 ─────────────────────────────────────────────────────────────────
  test('TC12 - Delete own forum post', async ({ page }) => {
    const stamp = Date.now();
    const subject = `Automation delete thread ${stamp}`;
    const message = `This post will be deleted (${stamp}).`;

    await login(page);
    await createPost(page, subject, message);
    await openDiscussion(page, subject);

    // Delete our own post and confirm the prompt (modal dialog or confirmation page)
    await page.locator('a[href*="post.php?delete="]').first().click();
    await page.getByRole('button', { name: 'Continue' }).or(
      page.getByRole('button', { name: 'Delete' })
    ).first().click({ timeout: TIMEOUT });

    // Back in the forum, the discussion is no longer listed
    await expect(page).toHaveURL(/\/mod\/forum\/view\.php/, { timeout: TIMEOUT });
    await openForum(page);
    await expect(page.locator('a', { hasText: subject })).toHaveCount(0);
  });

});
