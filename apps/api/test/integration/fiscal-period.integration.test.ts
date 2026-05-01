import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestDb } from '../helpers/db-container';
import { AccountingService } from '../../src/modules/accounting/accounting.service';
import { JournalService } from '../../src/modules/accounting/journal.service';
import { PrismaService } from '../../src/common/database/prisma.service';
import { EntryLineType } from '@klariq/db';

describe('Fiscal Period State Machine Integration', () => {
  let testDb: TestDb;
  let accountingService: AccountingService;
  let journalService: JournalService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    testDb = new TestDb();
    const prisma = await testDb.setup();
    prismaService = { client: prisma } as any;
    accountingService = new AccountingService(prismaService);
    journalService = new JournalService(prismaService);
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  it('should transition period status correctly', async () => {
    const prisma = testDb.getPrisma();

    // 1. Setup Company
    const company = await prisma.company.create({
      data: { name: 'Period Test Co', externalId: 'ext-p1', baseCurrency: 'CAD' },
    });

    // 2. Open Period
    const period = await accountingService.openPeriod(
      company.id,
      new Date('2026-01-01'),
      new Date('2026-01-31')
    );
    expect(period.status).toBe('OPEN');

    // 3. Close Period
    const closed = await accountingService.closePeriod(company.id, period.id);
    expect(closed.status).toBe('CLOSED');

    // 4. Try to close again (should fail)
    await expect(accountingService.closePeriod(company.id, period.id))
      .rejects.toThrow('Period is not open');
  });

  it('should prevent creating journal entries in a CLOSED period', async () => {
    const prisma = testDb.getPrisma();
    const company = await prisma.company.create({
      data: { name: 'Closed Period Co', externalId: 'ext-p2', baseCurrency: 'CAD' },
    });

    // Create an account
    const account = await prisma.account.create({
      data: { companyId: company.id, code: '1000', name: 'Cash', type: 'ASSET' },
    });

    // Create a CLOSED period
    const period = await prisma.fiscalPeriod.create({
      data: {
        companyId: company.id,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
        status: 'CLOSED',
      },
    });

    // Attempt to create entry for that date
    await expect(journalService.createEntry(company.id, 'user-1', {
      date: '2026-02-15',
      description: 'Entry in closed period',
      type: 'MANUAL',
      lines: [
        {
          accountId: account.id,
          type: EntryLineType.DEBIT,
          amount: '100.0000',
          currency: 'CAD',
        },
        {
          accountId: account.id, // Balanced with self for simplicity in this test
          type: EntryLineType.CREDIT,
          amount: '100.0000',
          currency: 'CAD',
        },
      ],
    })).rejects.toThrow('No open fiscal period found for this date');
  });
});
