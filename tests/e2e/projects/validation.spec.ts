import { test, expect } from '@playwright/test';

test.describe('Project Management - Backend Validation', () => {
  test('Backend rejects batch with more than 20 participants on project creation', async ({ request }) => {
    const tooManyParticipants = Array.from({ length: 21 }, (_, i: number) => ({
      name: `Participant ${i}`,
      email: `p${i}-${Date.now()}@example.com`,
    }));

    const res = await request.post('/api/projects', {
      data: {
        name: `Overflow Project ${Date.now()}`,
        description: 'Testing batch size validation',
        batchName: 'Overflow Batch',
        configuration: '{}',
        participants: tooManyParticipants,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    console.log(`[Validation] Rejection: ${body.error}`);
    expect(body.error).toMatch(/20 participants/);
  });

  test('Backend rejects adding participants over 20 to existing batch', async ({ request }) => {
    // Create a new project + batch via API
    const createRes = await request.post('/api/projects', {
      data: {
        name: `Batch Add Project ${Date.now()}`,
        description: 'Test',
        batchName: 'Initial Batch',
        configuration: '{}',
        participants: [],
      },
    });
    expect(createRes.status()).toBe(201);
    const project = await createRes.json();
    const batchId = project.batches[0].id;

    // Add 20 participants — should succeed
    const fillUp = Array.from({ length: 20 }, (_, i: number) => ({
      name: `P ${i}`,
      email: `bp${i}-${Date.now()}@example.com`,
    }));
    const fillRes = await request.post(`/api/batches/${batchId}/participants`, {
      data: { participants: fillUp },
    });
    expect(fillRes.status()).toBe(201);

    // Try to add 1 more — should fail
    const overflowRes = await request.post(`/api/batches/${batchId}/participants`, {
      data: { participants: [{ name: 'Overflow', email: `over-${Date.now()}@example.com` }] },
    });
    expect(overflowRes.status()).toBe(400);
    const body = await overflowRes.json();
    expect(body.error).toMatch(/20 participants/);
  });

  test('Submit Project event is generated upon creation', async ({ request }) => {
    const createRes = await request.post('/api/projects', {
      data: {
        name: `Event Test Project ${Date.now()}`,
        description: 'Testing event generation',
        batchName: 'Batch 1',
        configuration: '{}',
        participants: [],
      },
    });
    expect(createRes.status()).toBe(201);
    const project = await createRes.json();

    const detailRes = await request.get(`/api/projects/${project.id}`);
    const detail = await detailRes.json();
    const events: Array<{ type: string }> = detail.events || [];
    const submitEvent = events.find((e) => e.type === 'Submit Project');
    expect(submitEvent).toBeTruthy();
    console.log(`[Validation] Submit Project event found for project ${project.id}`);
  });
});
