import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

const VALID_CSV = `code,name,type,description,behavioralIndicators
E2E-POT-${Date.now()},E2E Potensi,potensi,A new potensi for E2E,Indicator one | Indicator two
E2E-KOM-${Date.now()},E2E Kompetensi,kompetensi,A new kompetensi for E2E,Behavior A | Behavior B
`;

const INVALID_CSV = `code,name,type,description,behavioralIndicators
,Missing Code Item,potensi,Some description,Some indicator
DUP-1,First Item,potensi,Desc,Ind
DUP-1,Duplicate Code,kompetensi,Desc2,Ind2
BAD-TYPE-1,Bad Type Item,unknown_type,Desc,Ind
NO-DESC-1,No Description,potensi,,Ind
`;

async function writeTempCsv(prefix: string, content: string): Promise<string> {
  const filePath = path.join(os.tmpdir(), `${prefix}-${Date.now()}.csv`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

test.describe('Kamus Upload', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus/upload...`);
    const response = await page.goto('/admin/kamus/upload');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/admin\/kamus\/upload/);
    await expect(page.getByTestId('kamus-upload-page-nav')).toBeVisible();
  });

  test('Admin uploads a valid Kamus template file and Kamus Submitted event is generated', async ({ page }) => {
    const filePath = await writeTempCsv('valid-kamus', VALID_CSV);

    await page.getByTestId('kamus-file-input').setInputFiles(filePath);
    await page.getByTestId('submit-kamus-upload-btn').click();

    await expect(page.getByTestId('kamus-created-alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('kamus-created-alert')).toContainText('Kamus Submitted');

    // Verify event recorded
    const eventsRes = await page.request.get('/api/kamus/events');
    expect(eventsRes.ok()).toBeTruthy();
    const events = await eventsRes.json();
    const hasSubmittedEvent = events.some((e: { eventType: string }) => e.eventType === 'Kamus Submitted');
    expect(hasSubmittedEvent).toBeTruthy();

    fs.unlinkSync(filePath);
  });

  test('Admin uploads an invalid Kamus template and sees per-row error messages', async ({ page }) => {
    const filePath = await writeTempCsv('invalid-kamus', INVALID_CSV);

    await page.getByTestId('kamus-file-input').setInputFiles(filePath);
    await page.getByTestId('submit-kamus-upload-btn').click();

    const errorAlert = page.getByTestId('kamus-error-alert');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });

    // Row 2: missing code
    await expect(errorAlert).toContainText('Row 2');
    // Row 4: duplicate code
    await expect(errorAlert).toContainText('Duplicate');
    // Row 5: bad type
    await expect(errorAlert).toContainText("must be 'potensi' or 'kompetensi'");
    // Row 6: missing description
    await expect(errorAlert).toContainText('description is required');

    fs.unlinkSync(filePath);
  });

  test('Admin downloads the empty Kamus template', async ({ page }) => {
    const downloadBtn = page.getByTestId('kamus-template-download-btn');
    await expect(downloadBtn).toBeVisible();

    // Test template endpoint directly
    const res = await page.request.get('/api/kamus/template');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('text/csv');
    const body = await res.text();
    expect(body).toContain('code,name,type,description,behavioralIndicators');
  });

  test('Admin uploads a large file and progress indicator is shown', async ({ page }) => {
    // Generate a large CSV (~150KB) to trigger progress
    const ts = Date.now();
    const header = 'code,name,type,description,behavioralIndicators\n';
    const rows: string[] = [];
    for (let i = 0; i < 800; i++) {
      rows.push(
        `LARGE-${ts}-${i},Large Item ${i},${i % 2 === 0 ? 'potensi' : 'kompetensi'},Description ${i.toString().repeat(20)},Indicator ${i}`,
      );
    }
    const filePath = await writeTempCsv('large-kamus', header + rows.join('\n') + '\n');

    await page.getByTestId('kamus-file-input').setInputFiles(filePath);
    await page.getByTestId('submit-kamus-upload-btn').click();

    // Progress indicator should appear briefly for large files
    await expect(page.getByTestId('kamus-upload-progress')).toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId('kamus-created-alert')).toBeVisible({ timeout: 30000 });

    fs.unlinkSync(filePath);
  });
});

test.describe('Kamus Update via re-upload (preview)', () => {
  test('Admin re-uploads template, sees preview of changes, and confirms', async ({ page }) => {
    // Step 1: initial upload to ensure something exists to update
    const ts = Date.now();
    const initialCode = `UPD-INIT-${ts}`;
    const initialCsv = `code,name,type,description,behavioralIndicators
${initialCode},Initial Name,potensi,Initial description,Initial indicator
`;
    const initialPath = await writeTempCsv('upd-init', initialCsv);

    await page.goto('/admin/kamus/upload');
    await page.getByTestId('kamus-file-input').setInputFiles(initialPath);
    await page.getByTestId('submit-kamus-upload-btn').click();
    await expect(page.getByTestId('kamus-created-alert')).toBeVisible({ timeout: 15000 });
    fs.unlinkSync(initialPath);

    // Step 2: re-upload with changes in update mode
    const updatedCsv = `code,name,type,description,behavioralIndicators
${initialCode},Updated Name,potensi,Updated description,Updated indicator
NEW-ADD-${ts},Brand New,kompetensi,New desc,New indicator
`;
    const updatedPath = await writeTempCsv('upd-changed', updatedCsv);

    await page.goto('/admin/kamus/upload');
    await page.getByTestId('kamus-mode-update').check();
    await page.getByTestId('kamus-file-input').setInputFiles(updatedPath);
    await page.getByTestId('submit-kamus-upload-btn').click();

    await expect(page.getByTestId('kamus-preview-container')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('kamus-preview-update-count')).toContainText('1');
    await expect(page.getByTestId('kamus-preview-create-count')).toContainText('1');

    await page.getByTestId('kamus-confirm-update-btn').click();
    await expect(page.getByTestId('kamus-created-alert')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('kamus-created-alert')).toContainText('Kamus Submitted');

    fs.unlinkSync(updatedPath);
  });
});
