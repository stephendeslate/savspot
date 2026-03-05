import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('home page loads and shows SavSpot heading', async ({ page }) => {
    await page.goto('/');

    // The root page renders an <h1> with "SavSpot"
    const heading = page.getByRole('heading', { level: 1, name: 'SavSpot' });
    await expect(heading).toBeVisible();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');

    // The login page renders a "Welcome back" heading
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();
  });
});
