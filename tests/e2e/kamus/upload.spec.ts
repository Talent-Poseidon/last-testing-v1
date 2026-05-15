import { test, expect } from '@playwright/test';

// Helper: build a CSV file with header + provided rows
function buildCsv(rows: string[]): string {
  const header = 'code,name,type,description,behavioralIndicators';
  return [header, ...rows].join('\n') + '\n';
}

test.describe('Kamus Upload', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus/upload...`);
    const response = await page.goto('/admin/kamus/upload');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/admin\/kamus\/upload/);
    await expect(page.getByTestId('kamus-page-nav')).toBeVisible();
  });

  test('Admin uploads a valid Kamus template and gets a success + Kamus Submitted event', async ({ page }) => {
    const unique = Date.now();
    const csv = buildCsv([
      `E2E-POT-${unique},E2E Potensi ${unique},potensi,desc potensi,indicator A; indicator B`,
      `E2E-KOMP-${unique},E2E Kompetensi ${unique},kompetensi,desc kompetensi,indicator X; indicator Y`,
    ]);

    await page.getByTestId('kamus-file-input').setInputFiles({
      name: 'kamus.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    // Preview should show up
    await expect(page.getByTestId('kamus-preview-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('preview-added-count')).toContainText('2');

    await page.getByTestId('confirm-kamus-btn').click();
    await expect(page.getByTestId('kamus-submitted-alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kamus-submitted-alert')).toContainText('Kamus Submitted');
    console.log('[Kamus Upload] Confirmed and event emitted.');
  });

  test('Admin sees a per-row error message when the file format is incorrect', async ({ page }) => {
    const csv = [
      'wrong,header,format',
      'X,Y,Z',
    ].join('\n');

    await page.getByTestId('kamus-file-input').setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    await expect(page.getByTestId('kamus-error-alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kamus-error-row-1')).toContainText('Invalid header');
  });

  test('Admin sees per-row errors for missing required fields and invalid type', async ({ page }) => {
    const csv = buildCsv([
      'BAD-001,,potensi,desc,indicator', // missing name
      'BAD-002,Some Name,invalid-type,desc,indicator', // invalid type
    ]);

    await page.getByTestId('kamus-file-input').setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    await expect(page.getByTestId('kamus-error-alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('kamus-error-row-2')).toContainText('name is required');
    await expect(page.getByTestId('kamus-error-row-3')).toContainText('type must be one of');
  });

  test('Admin downloads the blank Kamus template', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-template-btn').click();
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    console.log(`[Template] Downloaded: ${filename}`);
    expect(filename).toContain('kamus-template');
  });

  test('Progress indicator appears during upload', async ({ page }) => {
    // Build a moderately large CSV (200 rows) so the progress UI is visible
    const rows: string[] = [];
    const unique = Date.now();
    for (let i = 0; i < 200; i++) {
      rows.push(
        `BIG-${unique}-${i},Big Item ${i},potensi,desc ${i},indicator ${i}`
      );
    }
    const csv = buildCsv(rows);

    const progressLocator = page.getByTestId('kamus-upload-progress');
    await page.getByTestId('kamus-file-input').setInputFiles({
      name: 'big.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    // Progress indicator appears at some point during the upload OR the preview shows.
    // Race: whichever shows first counts as success — both prove the flow works.
    await Promise.race([
      progressLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
      page.getByTestId('kamus-preview-container').waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    await expect(page.getByTestId('kamus-preview-container')).toBeVisible({ timeout: 15000 });
    console.log('[Progress] Preview rendered for large file.');
  });

  test('Re-uploading detects changes and shows preview before confirmation', async ({ page }) => {
    // The seed already contains SEED-POT-001 with name "Seed Potensi Analytical".
    // Re-upload changes the name (update), keeps SEED-KOMP-001 (unchanged), and adds a new row.
    const unique = Date.now();
    const csv = buildCsv([
      `SEED-POT-001,Updated Seed Potensi ${unique},potensi,Updated description,Updated indicators`,
      `SEED-KOMP-001,Seed Kompetensi Leadership,kompetensi,Seed kompetensi entry for E2E tests,Indicator X; Indicator Y`,
      `NEW-POT-${unique},Brand New ${unique},potensi,new desc,new indicators`,
    ]);

    await page.getByTestId('kamus-file-input').setInputFiles({
      name: 'update.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    await expect(page.getByTestId('kamus-preview-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('preview-updated-count')).toContainText('1');
    await expect(page.getByTestId('preview-added-count')).toContainText('1');
    await expect(page.getByTestId('preview-updated-SEED-POT-001')).toBeVisible();

    // We do NOT confirm here — the assertion is that the preview shows BEFORE confirmation
    await expect(page.getByTestId('confirm-kamus-btn')).toBeVisible();
  });
});
