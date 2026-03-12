import { test, expect } from '@playwright/test';
import { TEST_TENANT, EXPECTED_SERVICES } from './fixtures/test-data';

/**
 * Public Booking Flow E2E Tests
 *
 * These tests verify the customer-facing booking page at /book/[slug].
 * They require the full dev server (API + web) to be running so that
 * tenant data and services can load from the API.
 */
test.describe('Public Booking Flow', () => {
  test('booking page loads and displays the business name', async ({
    page,
  }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // The page should render the tenant name as an h1
    const heading = page.getByRole('heading', {
      level: 1,
      name: TEST_TENANT.name,
    });
    await expect(heading).toBeVisible();
  });

  test('service cards are displayed with "Book Now" buttons', async ({
    page,
  }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);

    await page.waitForLoadState('networkidle');

    // Wait for the "Our Services" section heading to appear
    const servicesHeading = page.getByRole('heading', {
      name: /our services/i,
    });
    await expect(servicesHeading).toBeVisible();

    // Verify at least one "Book Now" button exists (one per service card)
    const bookNowButtons = page.getByRole('button', { name: /book now/i });
    await expect(bookNowButtons.first()).toBeVisible();

    // Verify the expected seed services are shown
    for (const serviceName of EXPECTED_SERVICES) {
      await expect(page.getByRole('heading', { name: serviceName })).toBeVisible();
    }
  });

  test('clicking "Book Now" starts the booking wizard', async ({ page }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);

    await page.waitForLoadState('networkidle');

    // Wait for services to render
    const bookNowButtons = page.getByRole('button', { name: /book now/i });
    await expect(bookNowButtons.first()).toBeVisible();

    // Click "Book Now" and wait for the API response
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/booking-sessions') &&
          resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      bookNowButtons.first().click(),
    ]);

    // Verify the API call succeeded
    expect(response.status()).toBe(201);

    // After a booking session is created, the wizard should appear and the
    // "Back to <BusinessName>" link should be visible
    const backButton = page.getByText(new RegExp(`Back to ${TEST_TENANT.name}`, 'i'));
    await expect(backButton).toBeVisible({ timeout: 15_000 });
  });

  test('displays "Business Not Found" for an invalid slug', async ({
    page,
  }) => {
    await page.goto('/book/nonexistent-business-12345');
    await page.waitForLoadState('networkidle');

    // The not-found state should show the appropriate heading
    const heading = page.getByRole('heading', {
      name: /business not found/i,
    });
    await expect(heading).toBeVisible();
  });
});
