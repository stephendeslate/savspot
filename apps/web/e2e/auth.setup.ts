import { test as setup, expect } from '@playwright/test';
import { TEST_USER } from './fixtures/test-data';

const AUTH_STATE_PATH = 'e2e/.auth/user.json';

/**
 * Global auth setup — runs once before all test projects that depend on it.
 * Logs in via the web login form and saves the resulting storage state
 * (cookies + localStorage) so subsequent tests start already authenticated.
 */
setup('authenticate', async ({ page }) => {
  // Navigate to the login page
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  // Fill in credentials
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);

  // Submit the form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation to the dashboard (indicates successful login)
  await page.waitForURL('/dashboard', { timeout: 15_000 });

  // Persist the authenticated state for other projects to reuse
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
