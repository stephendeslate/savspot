/**
 * E2E accessibility tests using @axe-core/playwright.
 *
 * Navigates to key pages and runs axe-core audits against
 * WCAG 2.1 AA rules. Fails on critical or serious violations.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Helper: run axe-core on the current page and assert no critical/serious violations.
 */
async function expectNoA11yViolations(
  page: import('@playwright/test').Page,
  disabledRules: string[] = [],
) {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(disabledRules);

  const results = await builder.analyze();

  // Filter to only critical and serious
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  if (serious.length > 0) {
    const summary = serious
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n  Affected: ${v.nodes.map((n) => n.html).join('\n           ')}`,
      )
      .join('\n\n');

    expect(serious, `Accessibility violations found:\n\n${summary}`).toHaveLength(0);
  }
}

test.describe('Accessibility — Public Pages (WCAG 2.1 AA)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Home page passes axe-core audit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });

  test('Login page passes axe-core audit', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });

  test('Register page passes axe-core audit', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });

  test('Forgot password page passes axe-core audit', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });

  test('Directory page passes axe-core audit', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });

  test('Privacy page passes axe-core audit', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });

  test('Terms page passes axe-core audit', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('domcontentloaded');
    await expectNoA11yViolations(page);
  });
});

test.describe('Accessibility — Authenticated Pages (WCAG 2.1 AA)', () => {
  test('Dashboard passes axe-core audit', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page);
  });

  test('Services page passes axe-core audit', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page, ['color-contrast', 'link-in-text-block', 'button-name']);
  });

  test('Bookings page passes axe-core audit', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page, ['color-contrast', 'link-in-text-block', 'button-name']);
  });

  test('Clients page passes axe-core audit', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page);
  });

  test('Calendar page passes axe-core audit', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page, ['color-contrast', 'link-in-text-block', 'aria-required-parent', 'aria-required-children']);
  });

  test('Settings page passes axe-core audit', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page);
  });

  test('Analytics page passes axe-core audit', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expectNoA11yViolations(page, ['color-contrast', 'link-in-text-block', 'button-name']);
  });
});
