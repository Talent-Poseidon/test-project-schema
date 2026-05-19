const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('adminpassword', 10);

  // Original Admin (preserve existing logic)
  const originalAdmin = await prisma.user.upsert({
    where: { email: 'admin@monster.com' },
    update: {
      password: adminPassword,
      role: 'admin',
      is_approved: true,
    },
    create: {
      email: 'admin@monster.com',
      name: 'Admin Monster',
      password: adminPassword,
      role: 'admin',
      is_approved: true,
    },
  });

  // Test Admin (for E2E tests)
  const testAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password,
      role: 'admin',
      is_approved: true,
    },
    create: {
      email: 'admin@example.com',
      name: 'Test Admin',
      password,
      role: 'admin',
      is_approved: true,
    },
  });

  // Test User (for E2E tests)
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      password,
      role: 'user',
      is_approved: true,
    },
    create: {
      email: 'user@example.com',
      name: 'Test User',
      password,
      role: 'user',
      is_approved: true,
    },
  });

  // Seed Kamus (free — not referenced, safe to delete)
  const seedKamusPotensi = await prisma.kamus.upsert({
    where: { code: 'SEED-POT-1' },
    update: {},
    create: {
      code: 'SEED-POT-1',
      name: 'Seed Analytical Thinking',
      type: 'potensi',
      description: 'Seeded potensi for E2E tests',
      behavioralIndicators: 'Indicator A | Indicator B',
    },
  });

  const seedKamusKompetensi = await prisma.kamus.upsert({
    where: { code: 'SEED-KOM-1' },
    update: {},
    create: {
      code: 'SEED-KOM-1',
      name: 'Seed Communication',
      type: 'kompetensi',
      description: 'Seeded kompetensi for E2E tests',
      behavioralIndicators: 'Indicator X | Indicator Y',
    },
  });

  // Seed Kamus that is REFERENCED by Standar Jabatan — must NOT be deletable
  const seedKamusUsed = await prisma.kamus.upsert({
    where: { code: 'SEED-USED-1' },
    update: {},
    create: {
      code: 'SEED-USED-1',
      name: 'Seed Leadership (Used)',
      type: 'kompetensi',
      description: 'Seeded kompetensi that is referenced by a Standar Jabatan',
      behavioralIndicators: 'Leads team | Motivates others',
    },
  });

  const seedStandar = await prisma.standarJabatan.upsert({
    where: { name: 'Seed Standar Manager' },
    update: {},
    create: {
      name: 'Seed Standar Manager',
      level: 'Manager',
      description: 'Standar Jabatan referencing SEED-USED-1',
    },
  });

  await prisma.standarJabatanItem.upsert({
    where: {
      standarJabatanId_kamusId: {
        standarJabatanId: seedStandar.id,
        kamusId: seedKamusUsed.id,
      },
    },
    update: {},
    create: {
      standarJabatanId: seedStandar.id,
      kamusId: seedKamusUsed.id,
      expectedLevel: 3,
    },
  });

  // Seed AssessorMaster for E2E tests (Assign Assessor feature)
  const seedAssessor1 = await prisma.assessorMaster.upsert({
    where: { email: 'assessor.one@example.com' },
    update: { name: 'Seed Assessor One', active: true },
    create: {
      id: 'seed-assessor-1',
      name: 'Seed Assessor One',
      email: 'assessor.one@example.com',
      active: true,
    },
  });

  const seedAssessor2 = await prisma.assessorMaster.upsert({
    where: { email: 'assessor.two@example.com' },
    update: { name: 'Seed Assessor Two', active: true },
    create: {
      id: 'seed-assessor-2',
      name: 'Seed Assessor Two',
      email: 'assessor.two@example.com',
      active: true,
    },
  });

  // Seed a Project (with batch + assessee) for "list contains existing project" and
  // invitation expiry/resend flows.
  const seedProject = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'Seed Project Alpha',
      description: 'Seeded project used by E2E tests',
      configuration: JSON.stringify({ template: 'default' }),
      status: 'submitted',
    },
  });

  const seedBatch = await prisma.projectBatch.upsert({
    where: { id: 'seed-batch-1' },
    update: {},
    create: {
      id: 'seed-batch-1',
      projectId: seedProject.id,
      name: 'Batch 1',
    },
  });

  const seedAssessee = await prisma.projectAssessee.upsert({
    where: { id: 'seed-assessee-1' },
    update: {},
    create: {
      id: 'seed-assessee-1',
      batchId: seedBatch.id,
      name: 'Seed Assessee',
      email: 'assessee.one@example.com',
    },
  });

  // Seed an EXPIRED invitation so the resend flow has something to act on.
  const expiredAt = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday
  const sentAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8); // 8 days ago
  const seedExpiredInvitation = await prisma.projectInvitation.upsert({
    where: { id: 'seed-invitation-expired-1' },
    update: { status: 'expired', sentAt, expiresAt: expiredAt },
    create: {
      id: 'seed-invitation-expired-1',
      projectId: seedProject.id,
      assesseeId: seedAssessee.id,
      email: seedAssessee.email,
      status: 'expired',
      sentAt,
      expiresAt: expiredAt,
    },
  });

  console.log({
    originalAdmin,
    testAdmin,
    testUser,
    seedKamusPotensi,
    seedKamusKompetensi,
    seedKamusUsed,
    seedStandar,
    seedAssessor1,
    seedAssessor2,
    seedProject,
    seedBatch,
    seedAssessee,
    seedExpiredInvitation,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
