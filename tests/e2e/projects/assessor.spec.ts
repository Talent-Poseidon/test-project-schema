import { test, expect } from '@playwright/test';

test.describe('Project Management - Assign Assessor', () => {
  test('Admin assigns an assessor from master data to the seed project', async ({
    page,
  }) => {
    console.log('[Test: assessor] Navigating to seed project detail...');
    const response = await page.goto('/admin/projects/seed-project-1');
    console.log(
      `[Test: assessor] Status: ${response?.status()} | URL: ${page.url()}`,
    );
    await expect(page.getByTestId('project-detail-page-nav')).toBeVisible();

    await expect(page.getByTestId('project-assessors-section')).toBeVisible();
    // Wait for the master assessor options to be populated.
    const select = page.getByTestId('project-assessor-select');
    await expect(select).toBeVisible();
    await expect
      .poll(async () => (await select.locator('option').count()), {
        timeout: 10000,
      })
      .toBeGreaterThan(1);

    await select.selectOption('seed-assessor-1');
    await page.getByTestId('project-assign-assessor-btn').click();

    await expect(page.getByTestId('project-assessor-success-alert')).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId('project-assessor-seed-assessor-1')).toBeVisible();

    // Confirm an "Assessor Assigned" event has been recorded.
    const eventList = page.getByTestId('project-events-list');
    await expect(eventList).toContainText('Assessor Assigned');
  });
});
