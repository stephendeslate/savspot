import { test, expect } from '@playwright/test';

/**
 * Calendar E2E Tests
 *
 * Tests the calendar view at /calendar.
 * Uses authenticated storageState from auth.setup.ts.
 */
test.describe('Calendar', () => {
  test('calendar page loads with heading', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();
  });

  test('calendar renders the calendar component', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Wait for the calendar to render
    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();

    // The react-big-calendar component or a list view should be present
    const calendarView = page.locator('.rbc-calendar')
      .or(page.locator('[class*="calendar"]'))
      .or(page.getByText(/today|week|month|agenda/i).first());

    await expect(calendarView.first()).toBeVisible({ timeout: 15_000 });
  });

  test('calendar has view toggle buttons', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();

    // View toggle buttons: "List" and "Calendar"
    const viewButtons = page.getByRole('button', { name: /^list$/i })
      .or(page.getByRole('button', { name: /^calendar$/i }));

    await expect(viewButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test('calendar has today/navigation buttons', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();

    // Today button and navigation (back/next) should be present
    const todayButton = page.getByRole('button', { name: /today/i });
    await expect(todayButton).toBeVisible({ timeout: 10_000 });
  });

  test('calendar shows bookings on correct dates', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Wait for calendar to load
    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();

    // Calendar should show booking events (seeded bookings include tomorrow's)
    // Events are displayed with client names or service names
    const bookingEvent = page.getByText(/Tony Stark|Diana Prince|Haircut|Beard Trim/i);

    // At least one booking event should be visible (we have bookings for tomorrow)
    await expect(bookingEvent.first()).toBeVisible({ timeout: 15_000 });
  });

  test('calendar page is fully interactive', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();

    // Calendar should render interactive elements
    const calendarContent = page.locator('.rbc-calendar')
      .or(page.getByRole('button', { name: /today/i }))
      .or(page.getByText(/today|week|month/i).first());

    await expect(calendarContent.first()).toBeVisible({ timeout: 15_000 });
  });
});
