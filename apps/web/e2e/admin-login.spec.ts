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
test.describe('Admin Authentication', () => {
  // Ensure these tests start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

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
    await page.goto('/login');

    // Fill in the test credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for successful redirect to the dashboard
    await page.waitForURL('/dashboard', { timeout: 15_000 });

    // The dashboard should display the welcome heading
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows navigation items', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard', { timeout: 15_000 });

    // On mobile viewports, open the hamburger menu to see navigation
    const menuButton = page.getByRole('button', { name: /open menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }

    // Verify key navigation links are visible (desktop sidebar or mobile nav).
    // Only one nav is rendered at a time due to lg:block / lg:hidden CSS.
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bookings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Services' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clients' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('logout returns to login page', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard', { timeout: 15_000 });

    // On mobile, open the hamburger menu to access the logout button
    const menuButton = page.getByRole('button', { name: /open menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }

    // Click the Logout button in the sidebar
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect back to login
    await page.waitForURL('/login', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();
  });
});
