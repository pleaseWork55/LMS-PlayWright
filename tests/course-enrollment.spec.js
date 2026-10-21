// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsStudent } from './helpers/auth.js';

const TIMEOUT = 60_000;

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

function getCourseLinks(page) {
  return page.locator(
    'a[href*="/course/view.php"]'
  );
}

async function getFirstCourse(page) {
  const courseLinks = getCourseLinks(page);

  await expect(
    courseLinks.first()
  ).toBeVisible({
    timeout: TIMEOUT
  });

  const courseLink = courseLinks.first();

  const courseName = (
    await courseLink.innerText()
  ).trim();

  return {
    courseLink,
    courseName
  };
}

async function openFirstCourse(page) {
  await openMyCourses(page);

  const course = await getFirstCourse(page);

  await course.courseLink.click();

  await expect(page).toHaveURL(
    /\/course\/view\.php/,
    {
      timeout: TIMEOUT
    }
  );

  await page.waitForLoadState('domcontentloaded');

  return course.courseName;
}

function getCourseContent(page) {
  return page.locator(
    '#region-main, ' +
    '[data-region="course-content"], ' +
    '.course-content'
  ).first();
}

async function enrolIfRequired(page) {
  const enrolButton = page.getByRole('button', {
    name: /enrol me/i
  }).first();

  const enrolLink = page.getByRole('link', {
    name: /enrol me/i
  }).first();

  if (await enrolButton.count() > 0) {
    await expect(enrolButton).toBeVisible({
      timeout: TIMEOUT
    });

    await enrolButton.click();

    await page.waitForLoadState('domcontentloaded');

    return true;
  }

  if (await enrolLink.count() > 0) {
    await expect(enrolLink).toBeVisible({
      timeout: TIMEOUT
    });

    await enrolLink.click();

    await page.waitForLoadState('domcontentloaded');

    return true;
  }

  return false;
}

test.describe.serial('Course Tests', () => {

  // TC04: Open a course
  test(
    'TC04 - Student can open a course',
    async ({ page }) => {
      const courseName = await openFirstCourse(page);

      await expect(
        page.locator('h1')
      ).toContainText(courseName, {
        timeout: TIMEOUT
      });

      console.log(
        `TC04 PASSED: Opened course "${courseName}"`
      );
    }
  );

  // TC05: Enrolment status
  test(
    'TC05 - Student enrolment is available or already complete',
    async ({ page }) => {
      const courseName = await openFirstCourse(page);

      const enrolmentActionPerformed =
        await enrolIfRequired(page);

      if (enrolmentActionPerformed) {
        console.log(
          `TC05 PASSED: Student enrolled in "${courseName}"`
        );
      } else {
        await expect(
          getCourseContent(page)
        ).toBeVisible({
          timeout: TIMEOUT
        });

        console.log(
          `TC05 PASSED: Student is already enrolled in "${courseName}"`
        );
      }
    }
  );

  // TC06: Check that course content is visible
  test(
    'TC06 - Course content is visible',
    async ({ page }) => {
      const courseName = await openFirstCourse(page);

      const courseContent = getCourseContent(page);

      await expect(courseContent).toBeVisible({
        timeout: TIMEOUT
      });

      const activity = page.locator(
        'li.activity a[href], ' +
        '.activity a[href], ' +
        '.modtype_label a[href], ' +
        '.aalink'
      ).first();

      await expect(activity).toBeVisible({
        timeout: TIMEOUT
      });

      const activityName = (
        await activity.innerText()
      ).trim();

      expect(activityName).not.toBe('');

      console.log(
        `TC06 PASSED: Content visible in "${courseName}" - ` +
        `${activityName}`
      );
    }
  );

  // TC07: Open enrolled courses by clicking My courses
  test(
    'TC07 - Student can open an enrolled course from My courses',
    async ({ page }) => {
      await openMyCourses(page);

      const course = await getFirstCourse(page);

      await course.courseLink.click();

      await expect(page).toHaveURL(
        /\/course\/view\.php/,
        {
          timeout: TIMEOUT
        }
      );

      await expect(
        page.locator('h1')
      ).toContainText(course.courseName, {
        timeout: TIMEOUT
      });

      console.log(
        `TC07 PASSED: Opened "${course.courseName}" from My courses`
      );
    }
  );

  // TC08: Search for a course
  test(
    'TC08 - Student can search for a course',
    async ({ page }) => {
      await openMyCourses(page);

      const course = await getFirstCourse(page);

      const searchBox = page.locator(
        'input[placeholder="Search"], ' +
        'input[aria-label*="Search" i], ' +
        'input[type="search"]'
      ).first();

      await expect(searchBox).toBeVisible({
        timeout: TIMEOUT
      });

      await searchBox.fill(course.courseName);

      await page.waitForTimeout(1_000);

      const searchResult = page.locator(
        'a[href*="/course/view.php"]'
      ).filter({
        hasText: course.courseName
      }).first();

      await expect(searchResult).toBeVisible({
        timeout: TIMEOUT
      });

      console.log(
        `TC08 PASSED: Search found "${course.courseName}"`
      );
    }
  );

  // TC09: Navigate to a section of a course
  test(
    'TC09 - Student can navigate to a course section',
    async ({ page }) => {
      const courseName = await openFirstCourse(page);

      const courseContent = getCourseContent(page);

      await expect(courseContent).toBeVisible({
        timeout: TIMEOUT
      });

      const section = page.locator(
        'li[id^="section-"], ' +
        '.course-section, ' +
        '[data-region="section"], ' +
        '.section'
      ).first();

      await expect(section).toBeVisible({
        timeout: TIMEOUT
      });

      await section.scrollIntoViewIfNeeded();

      const sectionHeading = section.locator(
        'h2, h3, .sectionname, ' +
        '[data-region="sectionname"]'
      ).first();

      await expect(sectionHeading).toBeVisible({
        timeout: TIMEOUT
      });

      const sectionName = (
        await sectionHeading.innerText()
      ).trim();

      expect(sectionName).not.toBe('');

      console.log(
        `TC09 PASSED: Navigated to "${sectionName}" ` +
        `in "${courseName}"`
      );
    }
  );

});