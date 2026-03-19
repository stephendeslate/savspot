import { test, expect } from '@playwright/test';

/**
 * Onboarding Flow E2E Tests
 *
 * Tests the business onboarding wizard at /onboarding.
 * Uses unauthenticated state to test the onboarding flow.
 *
 * NOTE: We don't complete the full onboarding (creating a real tenant)
 * to avoid polluting seed data. We test page rendering and form validation.
 */

test.describe('Onboarding Flow', () => {
  // Onboarding is a protected page (requires session cookie for middleware)
  // but the default test user is an OWNER who gets redirected to dashboard.
  // Use a session cookie without real auth — useAuth() returns no user,
  // so the wizard renders without the owner redirect.
  test.use({
    storageState: {
      cookies: [
        {
          name: 'savspot_session',
          value: 'true',
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax' as const,
          expires: -1,
        },
      ],
      origins: [],
    },
  });

  test('onboarding page loads', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Should show onboarding heading or first step
    await expect(
      page.getByRole('heading', { name: /what type of business|set up/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('onboarding shows business type selection', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // First step should have business type selection
    // This could be a dropdown, radio buttons, or cards
    const businessTypeControl = page.getByRole('button', { name: /salon|fitness|venue|studio|professional|other/i });
    await expect(businessTypeControl.first()).toBeVisible({ timeout: 10_000 });
  });

  test('onboarding has step indicators', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Should show step indicators (1, 2, 3 or Step 1 of 3, etc.)
    const stepIndicator = page.getByText('Business Type')
      .or(page.getByText('Business Profile'))
      .or(page.getByText('Review & Create'));
    await expect(stepIndicator.first()).toBeVisible({ timeout: 10_000 });
  });

  test('onboarding has next/continue button', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Should have a next/continue button
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await expect(nextButton).toBeVisible({ timeout: 10_000 });
  });
});
