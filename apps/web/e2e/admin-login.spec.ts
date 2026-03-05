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

    // The dashboard should display the user's name somewhere in the UI
    await expect(page.getByText(TEST_USER.name)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('dashboard shows sidebar navigation items', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard', { timeout: 15_000 });

    // Verify the sidebar contains expected navigation links (desktop)
    const sidebar = page.locator('nav');
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Bookings')).toBeVisible();
    await expect(sidebar.getByText('Calendar')).toBeVisible();
    await expect(sidebar.getByText('Services')).toBeVisible();
    await expect(sidebar.getByText('Clients')).toBeVisible();
    await expect(sidebar.getByText('Settings')).toBeVisible();
  });

  test('logout returns to login page', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard', { timeout: 15_000 });

    // Click the Logout button in the sidebar
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect back to login
    await page.waitForURL('/login', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();
  });
});
