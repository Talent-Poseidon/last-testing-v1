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

  // Seed Kamus for E2E tests
  const seedKamus1 = await prisma.kamus.upsert({
    where: { code: 'SEED-POT-001' },
    update: {},
    create: {
      id: 'seed-kamus-1',
      code: 'SEED-POT-001',
      name: 'Seed Potensi Analytical',
      type: 'potensi',
      description: 'Seed potensi entry for E2E tests',
      behavioralIndicators: 'Indicator A; Indicator B',
    },
  });

  const seedKamus2 = await prisma.kamus.upsert({
    where: { code: 'SEED-KOMP-001' },
    update: {},
    create: {
      id: 'seed-kamus-2',
      code: 'SEED-KOMP-001',
      name: 'Seed Kompetensi Leadership',
      type: 'kompetensi',
      description: 'Seed kompetensi entry for E2E tests',
      behavioralIndicators: 'Indicator X; Indicator Y',
    },
  });

  // Seed StandarJabatan + reference to seedKamus2 to enforce deletion-rejection
  const seedStandar = await prisma.standarJabatan.upsert({
    where: { id: 'seed-standar-1' },
    update: {},
    create: {
      id: 'seed-standar-1',
      name: 'Seed Standar Jabatan',
    },
  });

  await prisma.standarJabatanKamus.upsert({
    where: {
      standarJabatanId_kamusId: {
        standarJabatanId: 'seed-standar-1',
        kamusId: seedKamus2.id,
      },
    },
    update: {},
    create: {
      standarJabatanId: 'seed-standar-1',
      kamusId: seedKamus2.id,
      expectedLevel: 3,
    },
  });

  console.log({ originalAdmin, testAdmin, testUser, seedKamus1, seedKamus2, seedStandar });
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
