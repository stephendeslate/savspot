import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * Tests the admin dashboard at /dashboard.
 * Uses authenticated storageState from auth.setup.ts.
 */
test.describe('Dashboard', () => {
  test('dashboard loads with welcome heading', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();
  });

  test('dashboard displays stat cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to fully load
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();

    // Should show stat cards - look for common stat labels
    // Today's bookings, revenue, new clients, pending
    const statTexts = [
      /today.*booking|booking.*today/i,
      /revenue/i,
      /client/i,
      /pending/i,
    ];

    for (const statText of statTexts) {
      await expect(page.getByText(statText).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('dashboard shows quick action links', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();

    // Quick action links should be visible (accessible names include descriptions,
    // e.g. "Add Service Create a new bookable service", so use .first() to avoid strict mode)
    const quickActions = [
      /add service/i,
      /manage availability/i,
      /view calendar/i,
    ];

    for (const action of quickActions) {
      await expect(
        page.locator('main').getByRole('link', { name: action }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('quick action "View Calendar" navigates to calendar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();

    // Click the View Calendar quick action
    const calendarLink = page.getByRole('link', { name: /view calendar/i }).first();
    await expect(calendarLink).toBeVisible();
    await calendarLink.click();

    await page.waitForURL('**/calendar');
  });
});
