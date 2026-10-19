// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

const TIMEOUT = 60_000;
const COURSE_NAME = 'Celebrating Cultures';

async function openMyCourses(page) {
  await loginAsStudent(page);

  await page.goto(
    'https://school.moodledemo.net/my/courses.php',
    {
      waitUntil: 'domcontentloaded'
    }
  );

  await expect(
    page.locator('h1')
  ).toContainText('My courses', {
    timeout: TIMEOUT
  });
}

async function openSelectedCourse(page) {
  await openMyCourses(page);

  const courseLink = page.getByRole('link', {
    name: /Celebrating Cultures/i
  }).first();

  await expect(courseLink).toBeVisible({
    timeout: TIMEOUT
  });

  await courseLink.click();

  await page.waitForLoadState('domcontentloaded');

  await expect(page).toHaveURL(
    /\/course\/view\.php/,
    {
      timeout: TIMEOUT
    }
  );
}

test.describe('Courses', () => {

  // TC04: My courses lists enrolled courses
  test(
    'TC04 - My courses lists enrolled courses',
    async ({ page }) => {
      await openMyCourses(page);

      const enrolledCourse = page.getByRole('link', {
        name: /Celebrating Cultures/i
      }).first();

      await expect(enrolledCourse).toBeVisible({
        timeout: TIMEOUT
      });

      const courseName = await enrolledCourse.innerText();

      expect(courseName.trim()).not.toBe('');

      console.log(
        `TC04 PASSED: Enrolled course listed - ${courseName.trim()}`
      );
    }
  );

  // TC05: Open a course
  test(
    'TC05 - Student can open a course',
    async ({ page }) => {
      await openSelectedCourse(page);

      await expect(
        page.locator('h1')
      ).toContainText(COURSE_NAME, {
        timeout: TIMEOUT
      });

      console.log(
        'TC05 PASSED: Course page opened with the correct title'
      );
    }
  );

  // TC06: Course content is visible and a resource opens
  test(
  'TC06 - Course content and resource are visible',
  async ({ page }) => {
    await openSelectedCourse(page);

    const courseContent = page.locator(
      '#region-main, ' +
      '[data-region="course-content"], ' +
      '.course-content'
    ).first();

    await expect(courseContent).toBeVisible({
      timeout: TIMEOUT
    });

    console.log('Course content area is visible');

    const activities = page.locator(
      'li.activity a[href], ' +
      '.activity a[href], ' +
      '.modtype_label a[href], ' +
      '.aalink'
    ).first();

    await expect(activities).toBeVisible({
      timeout: TIMEOUT
    });

    const activityName = (
      await activities.innerText()
    ).trim();

    expect(activityName).not.toBe('');

    console.log(
      `Opening course resource: ${activityName}`
    );

    await activities.click();

    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.locator(
        '#region-main, ' +
        '[role="main"], ' +
        '.activity-header, ' +
        '.course-content'
      ).first()
    ).toBeVisible({
      timeout: TIMEOUT
    });

    console.log(
      `TC06 PASSED: Resource opened - ${activityName}`
    );
  }
);

});