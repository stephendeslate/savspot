/**
 * E2E accessibility tests using @axe-core/playwright.
 *
 * Navigates to key public pages and runs axe-core audits against
 * WCAG 2.1 AA rules. Fails on critical or serious violations.
 *
 * These tests do NOT require authentication and run against public routes.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Use the default test config (no storageState needed for public pages)
test.use({ storageState: { cookies: [], origins: [] } });

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

test.describe('Accessibility — WCAG 2.1 AA', () => {
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
});
