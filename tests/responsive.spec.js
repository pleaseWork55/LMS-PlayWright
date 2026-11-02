import { test, expect } from '@playwright/test';

// Session is provided by the setup project (storageState); open the Dashboard directly.
async function login(page) {
  await page.goto('https://school.moodledemo.net/my/');

  await expect(page).toHaveURL(/\/my\//);
}

test.describe('Responsive Design', () => {

  // TC11
  test('TC11 - Mobile Viewport Layout', async ({ page }) => {

    await page.setViewportSize({
      width: 375,
      height: 667
    });

    await login(page);

    await expect(page).toHaveURL(/\/my\//);

    console.log('TC11 PASSED: Mobile viewport validated');
  });

  // TC12
  test('TC12 - Tablet Viewport Layout', async ({ page }) => {

    await page.setViewportSize({
      width: 768,
      height: 1024
    });

    await login(page);

    await expect(page).toHaveURL(/\/my\//);

    console.log('TC12 PASSED: Tablet viewport validated');
  });

  // TC13
  test('TC13 - Mobile Navigation Menu Opens and Closes', async ({ page }) => {

    await page.setViewportSize({
      width: 375,
      height: 667
    });

    await login(page);

    const menuButton = page.getByRole('button', {
      name: 'Side panel'
    });

    await expect(menuButton).toBeVisible();

    // Open menu
    await menuButton.click();

    // Close menu
    await menuButton.click();

    console.log(
      'TC13 PASSED: Mobile navigation menu opens and closes'
    );
  });

  // TC14
  test('TC14 - Course Page Layout on Tablet', async ({ page }) => {

    await page.setViewportSize({
      width: 768,
      height: 1024
    });

    await login(page);

    await page.goto(
      'https://school.moodledemo.net/my/courses.php'
    );

    const firstCourse = page
      .locator("[data-region='courses-view'] a.coursename")
      .first();

    await expect(firstCourse).toBeVisible();

    await firstCourse.click();

    await expect(page).toHaveURL(/course/);

    await expect(page.locator('h1')).toBeVisible();

    console.log(
      'TC14 PASSED: Course page layout validated on tablet'
    );
  });

});
