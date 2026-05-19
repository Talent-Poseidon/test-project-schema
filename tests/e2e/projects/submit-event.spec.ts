import { test, expect } from '@playwright/test';

test.describe('Project Management - Submit Project event', () => {
  test('Creating a project records a "Submit Project" event', async ({
    request,
  }) => {
    const create = await request.post('/api/projects', {
      data: {
        name: `Event Project ${Date.now()}`,
        description: 'Project used for submit-event E2E',
        batchName: 'Initial Batch',
      },
    });
    expect(create.status()).toBe(201);
    const project = await create.json();

    const detail = await request.get(`/api/projects/${project.id}`);
    expect(detail.status()).toBe(200);
    const detailJson = await detail.json();

    const eventTypes = detailJson.events.map(
      (e: { eventType: string }) => e.eventType,
    );
    expect(eventTypes).toContain('Submit Project');
  });
});
