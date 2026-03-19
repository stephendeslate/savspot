import { test, expect } from '@playwright/test';
import { TEST_TENANT } from './fixtures/test-data';

/**
 * Public Booking Wizard E2E Tests
 *
 * These tests exercise the full booking wizard flow at /book/[slug].
 * They build on the basic booking-flow.spec.ts tests by going deeper
 * into the wizard steps.
 *
 * NOTE: Some wizard steps (date/time selection, guest info) depend on
 * the service configuration and availability rules. Tests are designed
 * to be resilient to different step sequences.
 */
test.describe('Public Booking Wizard', () => {
  test('booking page shows services with pricing', async ({ page }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // Wait for services to load
    await expect(
      page.getByRole('heading', { name: /our services/i }),
    ).toBeVisible();

    // Each service should show its price
    await expect(page.getByText('$30')).toBeVisible();
    await expect(page.getByText('$15')).toBeVisible();
    await expect(page.getByText('$60')).toBeVisible();
  });

  test('booking page shows service durations', async ({ page }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // Services should show duration info
    await expect(
      page.getByText(/30\s*min/i).first(),
    ).toBeVisible();
  });

  test('wizard shows date/time selection after starting', async ({ page }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // Click "Book Now" on the first service and wait for session creation
    const bookNowButtons = page.getByRole('button', { name: /book now/i });
    await expect(bookNowButtons.first()).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/booking-sessions') &&
          resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      bookNowButtons.first().click(),
    ]);

    expect(response.status()).toBe(201);

    // After wizard starts, should show date/time step heading (always visible on all viewports)
    const wizardStep = page.getByRole('heading', { name: /pick a date|date.*time|schedule|when/i });

    await expect(wizardStep.first()).toBeVisible({ timeout: 15_000 });
  });

  test('wizard has back navigation', async ({ page }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    const bookNowButtons = page.getByRole('button', { name: /book now/i });
    await expect(bookNowButtons.first()).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/booking-sessions') &&
          resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      bookNowButtons.first().click(),
    ]);

    expect(response.status()).toBe(201);

    // The "Back to BusinessName" link should be visible
    const backLink = page.getByText(new RegExp(`Back to ${TEST_TENANT.name}`, 'i'));
    await expect(backLink).toBeVisible({ timeout: 15_000 });
  });

  test('booking page for second tenant loads correctly', async ({ page }) => {
    await page.goto('/book/peak-performance-gym');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { level: 1, name: /Peak Performance Gym/i }),
    ).toBeVisible({ timeout: 20_000 });

    // Should show gym services
    await expect(
      page.getByText(/personal training/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('booking page for third tenant loads correctly', async ({ page }) => {
    await page.goto('/book/lakeside-event-center');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { level: 1, name: /Lakeside Event Center/i }),
    ).toBeVisible({ timeout: 20_000 });

    // Should show venue services
    await expect(
      page.getByText(/venue rental/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
