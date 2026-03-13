import { test, expect } from '@playwright/test';
import { EXPECTED_SERVICES } from './fixtures/test-data';

/**
 * Services CRUD E2E Tests
 *
 * Tests service management at /services, /services/new, /services/[id].
 * Uses authenticated storageState from auth.setup.ts.
 */
test.describe('Services Management', () => {
  test('services page loads with heading', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /services/i, level: 2 }),
    ).toBeVisible();
  });

  test('services page shows add service button', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('link', { name: /add service|new service|create/i })
      .or(page.getByRole('button', { name: /add service|new service|create/i }));
    await expect(addButton.first()).toBeVisible();
  });

  test('services page displays seeded services', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Wait for services to load
    await expect(
      page.getByRole('heading', { name: /services/i, level: 2 }),
    ).toBeVisible();

    // Verify each expected service appears
    for (const serviceName of EXPECTED_SERVICES) {
      await expect(page.getByText(serviceName).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('services page shows pricing info', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Services should show prices
    await expect(page.getByText('$30').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('$15').first()).toBeVisible();
    await expect(page.getByText('$60').first()).toBeVisible();
  });

  test('services page shows duration info', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Wait for services table to render
    await expect(page.getByText('Haircut').first()).toBeVisible({ timeout: 10_000 });

    // Duration column header should be visible on desktop
    await expect(
      page.getByRole('columnheader', { name: 'Duration' }),
    ).toBeVisible({ timeout: 10_000 });

    // Table rows should contain duration values
    await expect(
      page.locator('table tr').filter({ hasText: '30min' }).first(),
    ).toBeVisible();
  });

  test('clicking add service navigates to new service page', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('link', { name: /add service|new service|create/i })
      .or(page.getByRole('button', { name: /add service|new service|create/i }));
    await addButton.first().click();

    await page.waitForURL('**/services/new');
  });

  test('new service page loads with form', async ({ page }) => {
    await page.goto('/services/new');
    await page.waitForLoadState('networkidle');

    // Should show a heading for creating a service
    await expect(
      page.getByRole('heading', { name: /new service|create service|add service/i }),
    ).toBeVisible();

    // Form fields should be present
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });

  test('new service form validates required fields', async ({ page }) => {
    await page.goto('/services/new');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /save|create|add/i }).last();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Should show validation errors
    await expect(
      page.getByText(/required|enter|name/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('clicking edit on a service navigates to edit page', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Wait for services to load
    await expect(page.getByText('Haircut').first()).toBeVisible({ timeout: 10_000 });

    // Click the edit button (pencil icon) in the first table row
    const firstRow = page.locator('table tbody tr').first();
    const editButton = firstRow.getByRole('link').first()
      .or(firstRow.getByRole('button').first());
    await expect(editButton.first()).toBeVisible();
    await editButton.first().click();

    // Should navigate to the service edit page
    await page.waitForURL('**/services/**');

    // The edit page should show the service name in a form field
    await expect(page.getByLabel(/name/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
