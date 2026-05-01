import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestDb } from '../helpers/db-container';
import { JournalService } from '../../src/modules/accounting/journal.service';
import { PrismaService } from '../../src/common/database/prisma.service';

describe('Multi-tenancy Isolation Integration', () => {
  let testDb: TestDb;
  let journalService: JournalService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    testDb = new TestDb();
    const prisma = await testDb.setup();
    prismaService = { client: prisma } as any;
    journalService = new JournalService(prismaService);
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  it('should not leak data between different companies', async () => {
    const prisma = testDb.getPrisma();

    // 1. Setup Company A
    const companyA = await prisma.company.create({
      data: { name: 'Company A', externalId: 'ext-a', baseCurrency: 'CAD' },
    });
    const accountA = await prisma.account.create({
      data: { companyId: companyA.id, code: '1000', name: 'Cash A', type: 'ASSET' },
    });

    // 2. Setup Company B
    const companyB = await prisma.company.create({
      data: { name: 'Company B', externalId: 'ext-b', baseCurrency: 'CAD' },
    });
    const accountB = await prisma.account.create({
      data: { companyId: companyB.id, code: '1000', name: 'Cash B', type: 'ASSET' },
    });

    // 3. Verify that Company A cannot see Company B's account by code (unique constraint is per company)
    const foundA = await prisma.account.findUnique({
      where: { companyId_code: { companyId: companyA.id, code: '1000' } },
    });
    expect(foundA?.name).toBe('Cash A');

    const foundB = await prisma.account.findUnique({
      where: { companyId_code: { companyId: companyB.id, code: '1000' } },
    });
    expect(foundB?.name).toBe('Cash B');

    // 4. Verify isolation in a "query all" scenario
    const allAccountsA = await prisma.account.findMany({
      where: { companyId: companyA.id },
    });
    expect(allAccountsA).toHaveLength(1);
    expect(allAccountsA[0]?.companyId).toBe(companyA.id);

    const allAccountsB = await prisma.account.findMany({
      where: { companyId: companyB.id },
    });
    expect(allAccountsB).toHaveLength(1);
    expect(allAccountsB[0]?.companyId).toBe(companyB.id);
  });
});
