import { test, expect } from '@playwright/test';

test.describe('Project Management - Project List', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/projects...`);
    const response = await page.goto('/admin/projects');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/admin\/projects/);
    await expect(page.getByTestId('project-list-page-nav')).toBeVisible();
  });

  test('Admin sees seeded project in list', async ({ page }) => {
    await expect(page.getByTestId('project-list-container')).toBeVisible();
    const firstItem = page.locator('[data-testid^="project-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    const count = await page.locator('[data-testid^="project-item-"]').count();
    console.log(`[Project List] Found ${count} projects`);
    expect(count).toBeGreaterThan(0);
    await expect(page.getByTestId('project-item-seed-project-1')).toBeVisible();
  });
});
