import { test, expect } from '@playwright/test';

/**
 * Team Settings E2E Tests
 *
 * These tests verify the team management page at /settings/team.
 * They use the authenticated storageState from auth.setup.ts.
 *
 * Requires the full dev server (API + web) to be running.
 */
test.describe('Team Settings', () => {
  test('team page loads with heading and invite button', async ({ page }) => {
    await page.goto('/settings/team');

    // The page should show the "Team" heading
    const heading = page.getByRole('heading', { level: 2, name: 'Team' });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Descriptive subtitle
    await expect(
      page.getByText(/manage your team members/i),
    ).toBeVisible();

    // The "Invite Member" button should be present
    const inviteButton = page.getByRole('button', {
      name: /invite member/i,
    });
    await expect(inviteButton).toBeVisible();
  });

  test('team page shows "Team Members" card', async ({ page }) => {
    await page.goto('/settings/team');

    // Wait for the page to load
    await expect(
      page.getByRole('heading', { level: 2, name: 'Team' }),
    ).toBeVisible({ timeout: 15_000 });

    // The "Team Members" card title should be visible
    await expect(page.getByText('Team Members')).toBeVisible();

    // Either a member list or the empty state should appear
    const memberCount = page.getByText(/member.*on your team/i);
    const emptyState = page.getByText(/your team is empty/i);
    const noTeamMembers = page.getByText(/no team members yet/i);

    await expect(
      memberCount.or(emptyState).or(noTeamMembers).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking "Invite Member" opens the invite dialog', async ({
    page,
  }) => {
    await page.goto('/settings/team');

    // Wait for the page to load
    await expect(
      page.getByRole('heading', { level: 2, name: 'Team' }),
    ).toBeVisible({ timeout: 15_000 });

    // Click the "Invite Member" button in the header
    await page.getByRole('button', { name: /invite member/i }).first().click();

    // A dialog/modal should appear — look for dialog elements
    // The InviteDialog likely has input fields for email and role
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('back button navigates to settings index', async ({ page }) => {
    await page.goto('/settings/team');

    // Wait for the page to load
    await expect(
      page.getByRole('heading', { level: 2, name: 'Team' }),
    ).toBeVisible({ timeout: 15_000 });

    // There is a back/arrow button that navigates to /settings
    // The back button is a ghost variant button with an ArrowLeft icon
    const backButton = page.locator('button').filter({
      has: page.locator('svg.lucide-arrow-left'),
    });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await page.waitForURL('/settings', { timeout: 10_000 });
  });
});
