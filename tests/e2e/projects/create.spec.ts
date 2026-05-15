import { test, expect } from '@playwright/test';

test.describe('Project Management - Create Project', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/projects/new...`);
    const response = await page.goto('/admin/projects/new');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/admin\/projects\/new/);
    await expect(page.getByTestId('project-page-nav')).toBeVisible();
  });

  test('Admin creates a new project and sees it in the project list', async ({ page }) => {
    const uniqueName = `E2E Project ${Date.now()}`;

    await page.fill('[data-testid="project-name-input"]', uniqueName);
    await page.fill('[data-testid="project-description-input"]', 'Created during E2E test');
    await page.fill('[data-testid="project-batch-input"]', 'Batch 1');
    await page.fill(
      '[data-testid="project-config-input"]',
      '{"kamusId":"seed-kamus-1"}'
    );

    await page.fill('[data-testid="participant-name-input"]', 'Participant Test');
    await page.fill('[data-testid="participant-email-input"]', `p-${Date.now()}@example.com`);
    await page.click('[data-testid="add-participant-btn"]');

    await page.click('[data-testid="submit-project-btn"]');

    await expect(page.getByTestId('project-created-alert')).toContainText(
      'Project created successfully'
    );
    console.log(`[Create Project] Created: ${uniqueName}`);

    // Should auto-redirect to project list page
    await page.waitForURL(/\/admin\/projects(\/?|\?.*)$/, { timeout: 10000 });
    await expect(page.getByTestId('project-list-container')).toBeVisible();

    // Verify the new project appears in the list
    const newItem = page.locator('[data-testid^="project-item-"]', { hasText: uniqueName });
    await expect(newItem.first()).toBeVisible({ timeout: 10000 });
  });

  test('Frontend rejects adding more than 20 participants in a batch', async ({ page }) => {
    await page.fill('[data-testid="project-name-input"]', 'Batch Limit Test');
    await page.fill('[data-testid="project-description-input"]', 'desc');
    await page.fill('[data-testid="project-batch-input"]', 'Batch 1');

    // Add 20 participants successfully
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="participant-name-input"]', `Participant ${i}`);
      await page.fill('[data-testid="participant-email-input"]', `p${i}-${Date.now()}@example.com`);
      await page.click('[data-testid="add-participant-btn"]');
    }
    await expect(page.getByTestId('participant-count')).toContainText('20 / 20');

    // Try to add a 21st participant
    await page.fill('[data-testid="participant-name-input"]', 'Overflow');
    await page.fill('[data-testid="participant-email-input"]', `overflow-${Date.now()}@example.com`);
    await page.click('[data-testid="add-participant-btn"]');

    await expect(page.getByTestId('project-error-alert')).toContainText(
      'Batch cannot contain more than 20 participants'
    );
  });
});
