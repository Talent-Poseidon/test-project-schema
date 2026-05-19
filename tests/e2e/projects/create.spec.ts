import { test, expect } from '@playwright/test';

test.describe('Project Management - Create Project', () => {
  test('Admin creates a new project and it appears in the list', async ({ page }) => {
    const uniqueName = `E2E Project ${Date.now()}`;

    console.log(`[Test: create] Navigating to /admin/projects/new...`);
    const response = await page.goto('/admin/projects/new');
    console.log(`[Test: create] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page.getByTestId('project-new-page-nav')).toBeVisible();

    await page.getByTestId('project-name-input').fill(uniqueName);
    await page.getByTestId('project-description-input').fill('Created by E2E test');
    await page.getByTestId('project-batch-input').fill('Batch 1');
    await page.getByTestId('submit-project-btn').click();

    await expect(page.getByTestId('project-created-alert')).toBeVisible({
      timeout: 10000,
    });
    console.log(`[Project] Created: ${uniqueName}`);

    // After redirect to list, the new project should be present.
    await page.waitForURL(/\/admin\/projects$/, { timeout: 10000 });
    await expect(page.getByTestId('project-page-nav')).toBeVisible();

    const firstItem = page.locator('[data-testid^="project-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const matching = page.locator(`[data-project-name="${uniqueName}"]`).first();
    await expect(matching).toBeVisible({ timeout: 10000 });
  });

  test('Submitting empty form shows a validation error', async ({ page }) => {
    await page.goto('/admin/projects/new');
    await expect(page.getByTestId('project-new-page-nav')).toBeVisible();

    // Clear the prefilled batch + configuration fields so the form is empty.
    await page.getByTestId('project-batch-input').fill('');
    await page.getByTestId('submit-project-btn').click();

    await expect(page.getByTestId('project-error-alert')).toBeVisible();
    await expect(page.getByTestId('project-error-alert')).toContainText('required');
  });
});
