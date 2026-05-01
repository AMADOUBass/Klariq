import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { EntryLineType } from '@klariq/db';

@Injectable()
export class TaxReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a tax report for a specific period by analyzing the ledger.
   * This is the most accurate way as it looks at the actual posted entries.
   */
  async generateReport(companyId: string, startDate: Date, endDate: Date) {
    // 1. Fetch relevant tax accounts
    const accounts = await this.prisma.client.account.findMany({
      where: {
        companyId,
        code: { in: ['2310', '2311', '2320', '2321'] },
      },
    });

    const accountMap = new Map(accounts.map((a: any) => [a.code, a.id]));

    // 2. Aggregate all journal lines for these accounts in the period
    const lines = await this.prisma.client.journalLine.findMany({
      where: {
        journalEntry: {
          companyId,
          date: { gte: startDate, lte: endDate },
          isPosted: true,
        },
        accountId: { in: Array.from(accountMap.values()) },
      },
    });

    const results = {
      gst: { collected: 0, paid: 0, net: 0 },
      qst: { collected: 0, paid: 0, net: 0 },
    };

    for (const line of lines) {
      const amount = line.amountCad.toNumber();
      // For Liabilities (23xx): 
      // - Credit increases the balance (Taxes collected from customers)
      // - Debit decreases the balance (Taxes paid to suppliers - ITC/ITR)
      
      const isCredit = line.type === EntryLineType.CREDIT;
      const val = isCredit ? amount : -amount;

      if (line.accountId === accountMap.get('2310')) {
        results.gst.collected += amount; // Always credit for 2310
      } else if (line.accountId === accountMap.get('2311')) {
        results.gst.paid += amount; // Always debit for 2311
      } else if (line.accountId === accountMap.get('2320')) {
        results.qst.collected += amount; // Always credit for 2320
      } else if (line.accountId === accountMap.get('2321')) {
        results.qst.paid += amount; // Always debit for 2321
      }
    }

    results.gst.net = results.gst.collected - results.gst.paid;
    results.qst.net = results.qst.collected - results.qst.paid;

    return {
      period: { start: startDate, end: endDate },
      gst: results.gst,
      qst: results.qst,
      totalNetTax: results.gst.net + results.qst.net,
      generatedAt: new Date().toISOString(),
    };
  }
}
