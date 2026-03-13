import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth Flows', () => {
  test.describe('Registration', () => {
    test('register page loads with form', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Should show registration heading
      await expect(
        page.getByRole('heading', { name: /create|sign up|register|get started/i }),
      ).toBeVisible();

      // Should have form fields
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
    });

    test('register form shows validation errors for empty submission', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /sign up|create|register/i });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Should show validation errors
      await expect(
        page.getByText(/required|enter|valid|invalid/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    });

    test('register form validates password requirements', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Fill email but use weak password
      await page.getByLabel(/email/i).fill('test-new@example.com');

      // Find password fields - there may be password and confirm password
      const passwordFields = page.getByLabel(/password/i);
      await passwordFields.first().fill('weak');

      // If there's a confirm password field, fill it too
      if (await passwordFields.nth(1).isVisible()) {
        await passwordFields.nth(1).fill('weak');
      }

      const submitButton = page.getByRole('button', { name: /sign up|create|register/i });
      await submitButton.click();

      // Should show password validation error
      await expect(
        page.getByText(/password|character|strong|uppercase|number|special/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    });

    test('register page has link to login', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Should have a link to login page
      const loginLink = page.getByRole('link', { name: /sign in|log in|login/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Forgot Password', () => {
    test('forgot password page loads with form', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForLoadState('networkidle');

      // Should show forgot password heading
      await expect(
        page.getByRole('heading', { name: /forgot|reset|recover/i }),
      ).toBeVisible();

      // Should have email input
      await expect(page.getByLabel(/email/i)).toBeVisible();

      // Should have submit button
      await expect(
        page.getByRole('button', { name: /send|reset|submit/i }),
      ).toBeVisible();
    });

    test('forgot password shows success after email submission', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForLoadState('networkidle');

      // Fill in email
      await page.getByLabel(/email/i).fill('marcus@smoothcuts.example.com');

      // Submit the form
      await page.getByRole('button', { name: /send|reset|submit/i }).click();

      // Should show a success message (even if email doesn't exist, for security)
      await expect(
        page.getByText(/sent|check your email|instructions|link/i),
      ).toBeVisible({ timeout: 10_000 });
    });

    test('forgot password has link back to login', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForLoadState('networkidle');

      const loginLink = page.getByRole('link', { name: /sign in|log in|login|back/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Reset Password', () => {
    test('reset password page handles missing token', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');

      // Without a token, should show error or redirect
      await expect(
        page.getByText(/invalid|expired|missing|token|error/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test('reset password page shows form for token (validated on submit)', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token-12345');
      await page.waitForLoadState('networkidle');

      // With a token present, the form renders (token validation happens server-side on submit)
      await expect(
        page.getByRole('heading', { name: /set new password|reset password/i }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Verify Email', () => {
    test('verify email page handles missing token', async ({ page }) => {
      await page.goto('/verify-email');
      await page.waitForLoadState('networkidle');

      // Without token, should show error
      await expect(
        page.getByText(/invalid|expired|missing|token|error|verification/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test('verify email page handles invalid token', async ({ page }) => {
      await page.goto('/verify-email?token=invalid-token-12345');
      await page.waitForLoadState('networkidle');

      // With invalid token, should show error
      await expect(
        page.getByText(/invalid|expired|error|failed|verification/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Accept Invitation', () => {
    test('accept invitation page handles missing token', async ({ page }) => {
      await page.goto('/accept-invitation');
      await page.waitForLoadState('networkidle');

      // Without token, should show error
      await expect(
        page.getByText(/invalid|expired|missing|token|error|invitation/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test('accept invitation page handles invalid token', async ({ page }) => {
      await page.goto('/accept-invitation?token=invalid-token-12345');
      await page.waitForLoadState('networkidle');

      // With invalid token, should show error
      await expect(
        page.getByText(/invalid|expired|error|failed|invitation/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
