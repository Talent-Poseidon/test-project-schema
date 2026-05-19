import { test, expect } from '@playwright/test';

test.describe('Project Management - List', () => {
  test('Admin sees the seeded project in the project list', async ({ page }) => {
    console.log('[Test: list] Navigating to /admin/projects...');
    const response = await page.goto('/admin/projects');
    console.log(`[Test: list] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page.getByTestId('project-page-nav')).toBeVisible();

    await expect(page.getByTestId('project-list-container')).toBeVisible();
    const firstItem = page.locator('[data-testid^="project-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const seeded = page.getByTestId('project-item-seed-project-1');
    await expect(seeded).toBeVisible();
  });

  test('Navigation has a Projects link in the top bar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('nav-projects-link')).toBeVisible();
    await page.getByTestId('nav-projects-link').click();
    await page.waitForURL(/\/admin\/projects$/, { timeout: 10000 });
    await expect(page.getByTestId('project-page-nav')).toBeVisible();
  });
});
