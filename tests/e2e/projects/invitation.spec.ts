import { test, expect } from '@playwright/test';

test.describe('Project Management - Invitations', () => {
  test('Admin sends invitations to participants', async ({ page, request }) => {
    // Use a freshly-created project so we have unsent assessees and a
    // predictable invitation count.
    const projectName = `Invite Project ${Date.now()}`;
    const create = await request.post('/api/projects', {
      data: {
        name: projectName,
        description: 'Project used by invitation E2E',
        batchName: 'Batch 1',
        configuration: { template: 'default' },
      },
    });
    expect(create.status()).toBe(201);
    const project = await create.json();

    const detail = await request.get(`/api/projects/${project.id}`);
    const detailJson = await detail.json();
    const batchId = detailJson.batches[0].id;

    // Add a participant to the batch.
    const addAssessee = await request.post(
      `/api/projects/${project.id}/assessees`,
      {
        data: {
          batchId,
          name: 'Participant One',
          email: `participant-${Date.now()}@example.com`,
        },
      },
    );
    expect(addAssessee.status()).toBe(201);

    await page.goto(`/admin/projects/${project.id}`);
    await expect(page.getByTestId('project-detail-page-nav')).toBeVisible();

    await page.getByTestId('project-send-invitations-btn').click();
    await expect(
      page.getByTestId('project-invitation-success-alert'),
    ).toBeVisible({ timeout: 10000 });

    // At least one invitation should now be in the list.
    const invList = page.getByTestId('project-invitations-list');
    await expect(invList).toBeVisible();
    const firstInv = page.locator('[data-testid^="project-invitation-"]').first();
    await expect(firstInv).toBeVisible({ timeout: 10000 });

    // An "Assessee Notified" event must be present.
    await expect(page.getByTestId('project-events-list')).toContainText(
      'Assessee Notified',
    );
  });

  test('Expired invitation can be resent and gets a fresh status', async ({
    page,
  }) => {
    // The seeded expired invitation is on seed-project-1 / seed-invitation-expired-1.
    await page.goto('/admin/projects/seed-project-1');
    await expect(page.getByTestId('project-detail-page-nav')).toBeVisible();

    const resendBtn = page.getByTestId(
      'project-invitation-resend-btn-seed-invitation-expired-1',
    );
    await expect(resendBtn).toBeVisible({ timeout: 10000 });
    await resendBtn.click();

    await expect(page.getByTestId('project-resend-success-alert')).toBeVisible({
      timeout: 10000,
    });

    // After resend there should be at least one invitation in 'sent' status.
    const sentRow = page.locator('[data-invitation-status="sent"]').first();
    await expect(sentRow).toBeVisible({ timeout: 10000 });
  });

  test('Invitations API marks past-due records as expired', async ({ request }) => {
    const res = await request.get('/api/projects/seed-project-1/invitations');
    expect(res.status()).toBe(200);
    const invitations = await res.json();
    // The seeded expired invitation OR its replacement (after resend) should be present.
    const expired = invitations.find(
      (i: { id: string; status: string }) =>
        i.id === 'seed-invitation-expired-1',
    );
    expect(expired?.status).toBe('expired');
  });
});
