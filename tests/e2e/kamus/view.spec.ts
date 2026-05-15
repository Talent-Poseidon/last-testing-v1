import { test, expect } from '@playwright/test';

test.describe('Kamus view list', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus...`);
    const response = await page.goto('/admin/kamus');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/admin\/kamus/);
    await expect(page.getByTestId('kamus-page-nav')).toBeVisible();
  });

  test('Admin views the Kamus list with submitted items', async ({ page }) => {
    await expect(page.getByTestId('kamus-list-container')).toBeVisible();
    const firstItem = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const count = await page.locator('[data-testid^="kamus-item-"]').count();
    console.log(`[Kamus List] Found ${count} items`);
    expect(count).toBeGreaterThan(0);

    // Seed items must show
    await expect(page.getByTestId('kamus-item-SEED-POT-001')).toBeVisible();
    await expect(page.getByTestId('kamus-item-SEED-KOMP-001')).toBeVisible();
  });

  test('Admin filters Kamus list by type', async ({ page }) => {
    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });

    await page.getByTestId('kamus-type-filter').selectOption('potensi');
    await expect(page.getByTestId('kamus-item-SEED-POT-001')).toBeVisible();
    await expect(page.getByTestId('kamus-item-SEED-KOMP-001')).not.toBeVisible();

    await page.getByTestId('kamus-type-filter').selectOption('kompetensi');
    await expect(page.getByTestId('kamus-item-SEED-KOMP-001')).toBeVisible();
    await expect(page.getByTestId('kamus-item-SEED-POT-001')).not.toBeVisible();
  });

  test('Admin searches Kamus list by name', async ({ page }) => {
    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });

    await page.getByTestId('kamus-search-input').fill('Leadership');
    await expect(page.getByTestId('kamus-item-SEED-KOMP-001')).toBeVisible();
    await expect(page.getByTestId('kamus-item-SEED-POT-001')).not.toBeVisible();
  });

  test('Deletion is blocked when Kamus is referenced by Standar Jabatan', async ({ page }) => {
    await expect(page.locator('[data-testid^="kamus-item-"]').first()).toBeVisible({ timeout: 10000 });

    // SEED-KOMP-001 is referenced by seed-standar-1 → delete must fail
    await page.getByTestId('delete-kamus-SEED-KOMP-001-btn').click();
    await expect(page.getByTestId('kamus-delete-error-alert')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('kamus-delete-error-alert')).toContainText('in use');
    await expect(page.getByTestId('kamus-delete-error-alert')).toContainText('Standar Jabatan');

    // Item still in list
    await expect(page.getByTestId('kamus-item-SEED-KOMP-001')).toBeVisible();
  });
});
