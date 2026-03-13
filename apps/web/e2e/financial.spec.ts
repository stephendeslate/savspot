import { test, expect } from '@playwright/test';

/**
 * Financial Pages E2E Tests
 *
 * Tests payment, invoice, and analytics pages.
 * Uses authenticated storageState from auth.setup.ts.
 */
test.describe('Financial Pages', () => {
  test.describe('Payments', () => {
    test('payments page loads with heading', async ({ page }) => {
      await page.goto('/payments');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /payments/i, level: 2 }),
      ).toBeVisible();
    });

    test('payments page shows list or empty state', async ({ page }) => {
      await page.goto('/payments');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /payments/i, level: 2 }),
      ).toBeVisible();

      // Either payment records or empty state
      const paymentContent = page.getByText(/amount|total|paid|date/i).first()
        .or(page.getByText(/no payments|no records|empty/i));

      await expect(paymentContent.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Invoices', () => {
    test('invoices page loads with heading', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /invoices/i, level: 2 }),
      ).toBeVisible();
    });

    test('invoices page shows list or empty state', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /invoices/i, level: 2 }),
      ).toBeVisible();

      // Either invoice records or empty state
      const invoiceContent = page.getByText(/invoice|amount|date|status/i).first()
        .or(page.getByText(/no invoices|empty/i));

      await expect(invoiceContent.first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Analytics', () => {
    test('analytics page loads with heading', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /analytics/i, level: 2 }),
      ).toBeVisible();
    });

    test('analytics page shows KPIs or upgrade prompt', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /analytics/i, level: 2 }),
      ).toBeVisible();

      // Analytics may show KPI cards or an upgrade prompt for FREE tier
      const kpiContent = page.getByText(/revenue|bookings|clients|growth/i).first()
        .or(page.getByText(/upgrade|premium|pro/i));

      await expect(kpiContent.first()).toBeVisible({ timeout: 10_000 });
    });

    test('analytics page has date range controls or filters', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /analytics/i, level: 2 }),
      ).toBeVisible();

      // Analytics typically has date range or period selectors
      const dateControl = page.getByLabel(/date|period|range/i)
        .or(page.getByRole('combobox', { name: /period|range/i }))
        .or(page.getByRole('button', { name: /7 days|30 days|this month|last month/i }))
        .or(page.getByText(/upgrade|pro/i));

      await expect(dateControl.first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
