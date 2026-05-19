import { test, expect } from '@playwright/test';

test.describe('Kamus Potensi & Kompetensi View', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus...`);
    const response = await page.goto('/admin/kamus');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/admin\/kamus/);
    await expect(page.getByTestId('kamus-page-nav')).toBeVisible();
  });

  test('Admin sees the list of submitted Kamus items', async ({ page }) => {
    await expect(page.getByTestId('kamus-list-container')).toBeVisible();

    const firstItem = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const count = await page.locator('[data-testid^="kamus-item-"]').count();
    console.log(`[Kamus List] Found ${count} items`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin filters by type', async ({ page }) => {
    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });

    await page.getByTestId('kamus-type-filter').selectOption('potensi');

    // Wait for re-render; should still have items because seed has potensi
    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });

    const rows = await page.locator('[data-testid^="kamus-item-"]').all();
    for (const row of rows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain('potensi');
    }
  });

  test('Admin searches by name or code', async ({ page }) => {
    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });

    await page.getByTestId('kamus-search-input').fill('SEED-KOM-1');

    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });
    const rows = await page.locator('[data-testid^="kamus-item-"]').all();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const text = await row.textContent();
      expect(text).toContain('SEED-KOM-1');
    }
  });
});

test.describe('Prevent Deletion of Used Kamus', () => {
  test('Deletion of a used Kamus is prevented with dependency message', async ({ page }) => {
    await page.goto('/admin/kamus');
    await expect(page.getByTestId('kamus-page-nav')).toBeVisible();

    // Filter to find the seeded "used" kamus (SEED-USED-1)
    await page.getByTestId('kamus-search-input').fill('SEED-USED-1');
    const targetRow = page.locator('[data-kamus-code="SEED-USED-1"]').first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    const deleteBtn = targetRow.locator('[data-kamus-code-delete="SEED-USED-1"]');
    await deleteBtn.click();

    await expect(page.getByTestId('kamus-delete-error-alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kamus-delete-error-alert')).toContainText('Standar Jabatan');
  });

  test('Update flow refuses to delete a referenced Kamus', async ({ page, request }) => {
    // Re-upload without SEED-USED-1 — should fail
    const csv = `code,name,type,description,behavioralIndicators
SEED-POT-1,Seed Analytical Thinking,potensi,Seeded potensi for E2E tests,Indicator A | Indicator B
SEED-KOM-1,Seed Communication,kompetensi,Seeded kompetensi for E2E tests,Indicator X | Indicator Y
`;
    const res = await request.post('/api/kamus/confirm-update', {
      data: { content: csv },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('Cannot delete');
    expect(data.blockedCodes).toContain('SEED-USED-1');
  });
});
