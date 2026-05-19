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

  console.log({
    originalAdmin,
    testAdmin,
    testUser,
    seedKamusPotensi,
    seedKamusKompetensi,
    seedKamusUsed,
    seedStandar,
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
