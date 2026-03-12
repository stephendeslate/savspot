import { test, expect } from '@playwright/test';
import { TEST_USER } from './fixtures/test-data';

/**
 * Admin Authentication E2E Tests
 *
 * These tests verify the login flow and authenticated dashboard experience.
 * They require the full dev server (API + web) to be running.
 *
 * NOTE: These tests do NOT use the shared authenticated storageState.
 * They exercise the login flow from scratch.
 */

/**
 * Helper: perform login and wait for dashboard to load.
 * Uses form submission via Enter key (more reliable than button click on mobile).
 */
async function loginAndWaitForDashboard(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);

  // Use Enter key on the password field — avoids mobile keyboard overlay
  // blocking the submit button
  await page.getByLabel(/password/i).press('Enter');

  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Authentication', () => {
  // Ensure these tests start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Should show the "Welcome back" heading
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();

    // Should have email and password inputs
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Should have a sign-in button
    await expect(
      page.getByRole('button', { name: /sign in/i }),
    ).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({
    page,
  }) => {
    await loginAndWaitForDashboard(page);

    // The dashboard should display the welcome heading
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('dashboard shows navigation items', async ({ page }) => {
    await loginAndWaitForDashboard(page);

    // On mobile viewports, open the hamburger menu to see navigation
    const menuButton = page.getByRole('button', { name: /open menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Wait for menu animation to complete
      await page.waitForTimeout(300);
    }

    // Verify key navigation links are visible (desktop sidebar or mobile nav).
    // Use exact: true to avoid matching dashboard quick-action links.
    const navLinks = ['Dashboard', 'Bookings', 'Calendar', 'Services', 'Clients', 'Settings'];
    for (const name of navLinks) {
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('logout returns to login page', async ({ page }) => {
    await loginAndWaitForDashboard(page);

    // On mobile, open the hamburger menu to access the logout button
    const menuButton = page.getByRole('button', { name: /open menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }

    // Click the Logout button in the sidebar
    // Use dispatchEvent to bypass Next.js dev overlay (<nextjs-portal>) intercepting clicks
    await page.getByRole('button', { name: /logout/i }).dispatchEvent('click');

    // Should redirect back to login
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();
  });
});
