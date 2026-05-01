const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  const company = await prisma.company.upsert({
    where: { externalId: 'test-org-123' },
    update: {},
    create: {
      externalId: 'test-org-123',
      name: 'Test Company',
      legalName: 'Test Company Inc.',
      baseCurrency: 'CAD',
    },
  });

  console.log('Upserted company:', company.id);

  const period = await prisma.fiscalPeriod.create({
    data: {
      companyId: company.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'OPEN',
    }
  });

  console.log('Created fiscal period:', period.id);

  const entry = await prisma.journalEntry.create({
    data: {
      companyId: company.id,
      periodId: period.id,
      date: new Date(),
      description: 'Initial Seed Entry',
      createdBy: 'test-user-123',
    }
  });

  console.log('Created journal entry:', entry.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
