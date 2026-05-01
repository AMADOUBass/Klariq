import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestDb } from '../helpers/db-container';
import { JournalService } from '../../src/modules/accounting/journal.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { EntryLineType } from '@klariq/db';

describe('Journal Entry Integration', () => {
  let testDb: TestDb;
  let journalService: JournalService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    testDb = new TestDb();
    const prisma = await testDb.setup();
    
    // Wrap the prisma client in the NestJS PrismaService
    prismaService = { client: prisma } as any;
    journalService = new JournalService(prismaService);
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  it('should create a balanced journal entry successfully', async () => {
    const prisma = testDb.getPrisma();

    // 1. Setup seed data
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        externalId: 'ext-comp-1',
        baseCurrency: 'CAD',
      },
    });

    const account1 = await prisma.account.create({
      data: {
        companyId: company.id,
        code: '1000',
        name: 'Cash',
        type: 'ASSET',
      },
    });

    const account2 = await prisma.account.create({
      data: {
        companyId: company.id,
        code: '2000',
        name: 'Revenue',
        type: 'REVENUE',
      },
    });

    const period = await prisma.fiscalPeriod.create({
      data: {
        companyId: company.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'OPEN',
      },
    });

    // 2. Create balanced entry
    const entry = await journalService.createEntry(company.id, 'user-1', {
      date: '2026-06-01',
      description: 'Test balanced entry',
      type: 'MANUAL',
      lines: [
        {
          accountId: account1.id,
          type: EntryLineType.DEBIT,
          amount: '100.0000',
          currency: 'CAD',
          description: 'Debit side',
        },
        {
          accountId: account2.id,
          type: EntryLineType.CREDIT,
          amount: '100.0000',
          currency: 'CAD',
          description: 'Credit side',
        },
      ],
    });

    expect(entry.id).toBeDefined();
    expect(entry.lines).toHaveLength(2);
  });

  it('should throw BadRequestException for an unbalanced entry', async () => {
    const prisma = testDb.getPrisma();
    
    // We can reuse the company/accounts/period created in the previous test or fetch them
    const company = await prisma.company.findFirst();
    const account1 = await prisma.account.findFirst({ where: { code: '1000' } });
    const account2 = await prisma.account.findFirst({ where: { code: '2000' } });

    if (!company || !account1 || !account2) throw new Error('Seed data missing');

    await expect(journalService.createEntry(company.id, 'user-1', {
      date: '2026-06-01',
      description: 'Unbalanced entry',
      type: 'MANUAL',
      lines: [
        {
          accountId: account1.id,
          type: EntryLineType.DEBIT,
          amount: '100.0000',
          currency: 'CAD',
          description: 'Debit side',
        },
        {
          accountId: account2.id,
          type: EntryLineType.CREDIT,
          amount: '99.9900', // Unbalanced
          currency: 'CAD',
          description: 'Credit side',
        },
      ],
    })).rejects.toThrow('Unbalanced entry: discrepancy of 0.0100 CAD');
  });
});
