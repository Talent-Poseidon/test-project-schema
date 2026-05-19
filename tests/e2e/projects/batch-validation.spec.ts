import { test, expect } from '@playwright/test';

test.describe('Project Management - Batch Validation (max 20 per batch)', () => {
  test('Backend rejects the 21st assessee in a single batch', async ({ request }) => {
    // Create a fresh project + batch.
    const projectName = `Batch Limit ${Date.now()}`;
    const create = await request.post('/api/projects', {
      data: {
        name: projectName,
        description: 'Project used for batch validation E2E',
        batchName: 'Limit Batch',
      },
    });
    expect(create.status()).toBe(201);
    const project = await create.json();

    const detail = await request.get(`/api/projects/${project.id}`);
    const detailJson = await detail.json();
    const batchId = detailJson.batches[0].id;

    // Fill the batch to 20.
    for (let i = 1; i <= 20; i++) {
      const res = await request.post(
        `/api/projects/${project.id}/assessees`,
        {
          data: {
            batchId,
            name: `Assessee ${i}`,
            email: `assessee-${i}-${Date.now()}@example.com`,
          },
        },
      );
      expect(res.status()).toBe(201);
    }

    // 21st must be rejected with a clear error.
    const overLimit = await request.post(
      `/api/projects/${project.id}/assessees`,
      {
        data: {
          batchId,
          name: 'Assessee 21',
          email: `assessee-21-${Date.now()}@example.com`,
        },
      },
    );
    expect(overLimit.status()).toBe(400);
    const body = await overLimit.json();
    expect(body.error).toMatch(/Maximum 20|Batch is full/i);

    // After creating a new batch, the next assessee should fit.
    const newBatch = await request.post(
      `/api/projects/${project.id}/batches`,
      { data: { name: 'Overflow Batch' } },
    );
    expect(newBatch.status()).toBe(201);
    const overflow = await newBatch.json();

    const accepted = await request.post(
      `/api/projects/${project.id}/assessees`,
      {
        data: {
          batchId: overflow.id,
          name: 'Assessee 21 (new batch)',
          email: `assessee-21-new-${Date.now()}@example.com`,
        },
      },
    );
    expect(accepted.status()).toBe(201);
  });
});
