import { test, expect } from '@playwright/test';

const SEED_PROJECT_ID = 'seed-project-1';
const SEED_ASSESSOR_ID = 'seed-assessor-1';
const INVALID_ASSESSOR_ID = 'definitely-not-a-real-assessor-id';

test.describe('Project Management - Assign Assessors', () => {
  test('Admin assigns assessor from valid master data', async ({ page, request }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/projects/${SEED_PROJECT_ID}...`);
    await page.goto(`/admin/projects/${SEED_PROJECT_ID}`);
    await expect(page.getByTestId('project-detail-container')).toBeVisible({ timeout: 10000 });

    await page.selectOption('[data-testid="assessor-select"]', SEED_ASSESSOR_ID);
    await page.click('[data-testid="assign-assessor-btn"]');

    await expect(page.getByTestId('assessor-assigned-alert')).toContainText(
      /assigned/i,
      { timeout: 10000 }
    );

    // Verify event was generated
    const apiRes = await request.get(`/api/projects/${SEED_PROJECT_ID}`);
    const data = await apiRes.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const assignedEvent = events.some((e: { type: string }) => e.type === 'Assessor Assigned');
    console.log(`[Assessors] Assessor Assigned event present: ${assignedEvent}`);
    expect(assignedEvent).toBeTruthy();
  });

  test('Backend rejects assessor not in master data', async ({ request }) => {
    const res = await request.post(`/api/projects/${SEED_PROJECT_ID}/assessors`, {
      data: { assessorIds: [INVALID_ASSESSOR_ID] },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/master data/i);
  });
});
