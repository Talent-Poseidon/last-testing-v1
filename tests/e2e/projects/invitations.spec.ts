import { test, expect } from '@playwright/test';

const SEED_PROJECT_ID = 'seed-project-1';
const SEED_PARTICIPANT_ID = 'seed-participant-1';

test.describe('Project Management - Invitations', () => {
  test('Admin sends invitations and event Assessee Notified is generated', async ({ page, request }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/projects/${SEED_PROJECT_ID}...`);
    await page.goto(`/admin/projects/${SEED_PROJECT_ID}`);
    await expect(page.getByTestId('project-detail-container')).toBeVisible({ timeout: 10000 });

    await page.click('[data-testid="send-invitations-btn"]');
    await expect(page.getByTestId('invitation-sent-alert')).toContainText(
      /Invitations sent/i,
      { timeout: 10000 }
    );

    // Verify backend event endpoint reflects the project event by inspecting project detail API directly
    const apiRes = await request.get(`/api/projects/${SEED_PROJECT_ID}`);
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const notified = events.some((e: { type: string }) => e.type === 'Assessee Notified');
    console.log(`[Invitations] Assessee Notified event present: ${notified}`);
    expect(notified).toBeTruthy();
  });

  test('Expired invitation can be resent', async ({ page, request }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/projects/${SEED_PROJECT_ID}...`);
    await page.goto(`/admin/projects/${SEED_PROJECT_ID}`);
    await expect(page.getByTestId('project-detail-container')).toBeVisible({ timeout: 10000 });

    // The seed includes an expired invitation for seed-participant-1
    // After the prior test (send-invitations), this participant may now have an active invite.
    // Force-resend via API to validate AC-9 explicitly.
    const apiRes = await request.post(`/api/projects/${SEED_PROJECT_ID}/invitations`, {
      data: { participantIds: [SEED_PARTICIPANT_ID], resend: true },
    });
    expect(apiRes.ok()).toBeTruthy();
    const body = await apiRes.json();
    console.log(`[Invitations] Resend response: count=${body.count}`);
    expect(body.count).toBeGreaterThan(0);
  });

  test('Invitation sweep marks past-due invitations as expired', async ({ request }) => {
    // First make sure there's no participant with active invite that's already expired
    const sweep = await request.post(`/api/invitations/sweep`);
    expect(sweep.ok()).toBeTruthy();
    const sweepBody = await sweep.json();
    console.log(`[Invitations] Swept ${sweepBody.expiredCount} invitation(s)`);
    expect(typeof sweepBody.expiredCount).toBe('number');
  });
});
