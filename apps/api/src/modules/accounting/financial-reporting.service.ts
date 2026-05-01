import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AccountType, EntryLineType } from '@klariq/db';

@Injectable()
export class FinancialReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a Profit & Loss (P&L) report.
   * Revenue - Expenses = Net Income.
   */
  async generatePL(companyId: string, startDate: Date, endDate: Date) {
    // Fetch all REVENUE and EXPENSE accounts
    const accounts = await this.prisma.client.account.findMany({
      where: {
        companyId,
        type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: { gte: startDate, lte: endDate },
              isPosted: true,
            },
          },
        },
      },
    });

    const report = {
      revenue: [] as any[],
      expenses: [] as any[],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
    };

    for (const acc of accounts) {
      let balance = 0;
      for (const line of acc.journalLines) {
        const amount = line.amountCad.toNumber();
        if (acc.type === AccountType.REVENUE) {
          // Revenue: Credit increases balance
          balance += (line.type === EntryLineType.CREDIT ? amount : -amount);
        } else {
          // Expense: Debit increases balance
          balance += (line.type === EntryLineType.DEBIT ? amount : -amount);
        }
      }

      const entry = { id: acc.id, code: acc.code, name: acc.name, balance };

      if (acc.type === AccountType.REVENUE) {
        report.revenue.push(entry);
        report.totalRevenue += balance;
      } else {
        report.expenses.push(entry);
        report.totalExpenses += balance;
      }
    }

    report.netIncome = report.totalRevenue - report.totalExpenses;

    return {
      period: { start: startDate, end: endDate },
      ...report,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a Balance Sheet.
   * Assets = Liabilities + Equity.
   */
  async generateBalanceSheet(companyId: string, date: Date) {
    // Fetch all ASSET, LIABILITY, and EQUITY accounts
    const accounts = await this.prisma.client.account.findMany({
      where: {
        companyId,
        type: { in: [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY] },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: { lte: date },
              isPosted: true,
            },
          },
        },
      },
    });

    const report = {
      assets: [] as any[],
      liabilities: [] as any[],
      equity: [] as any[],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
    };

    for (const acc of accounts) {
      let balance = 0;
      for (const line of acc.journalLines) {
        const amount = line.amountCad.toNumber();
        if (acc.type === AccountType.ASSET) {
          // Assets: Debit increases balance
          balance += (line.type === EntryLineType.DEBIT ? amount : -amount);
        } else {
          // Liabilities/Equity: Credit increases balance
          balance += (line.type === EntryLineType.CREDIT ? amount : -amount);
        }
      }

      const entry = { id: acc.id, code: acc.code, name: acc.name, balance };

      if (acc.type === AccountType.ASSET) {
        report.assets.push(entry);
        report.totalAssets += balance;
      } else if (acc.type === AccountType.LIABILITY) {
        report.liabilities.push(entry);
        report.totalLiabilities += balance;
      } else {
        report.equity.push(entry);
        report.totalEquity += balance;
      }
    }

    return {
      asOfDate: date,
      ...report,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a Cash Flow Statement (Indirect Method).
   */
  async generateCashFlow(companyId: string, startDate: Date, endDate: Date) {
    // 1. Get Net Income for the period
    const pl = await this.generatePL(companyId, startDate, endDate);
    const netIncome = pl.netIncome;

    // 2. Calculate changes in Working Capital
    // We compare balances at start vs end of period
    const arAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '1200' } });
    const apAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2100' } });

    const getBalance = async (accountId: string, date: Date) => {
      if (!accountId) return 0;
      const lines = await this.prisma.client.journalLine.findMany({
        where: {
          accountId,
          journalEntry: { date: { lte: date }, isPosted: true },
        },
      });
      return lines.reduce((sum, l) => {
        const amt = l.amountCad.toNumber();
        return sum + (l.type === EntryLineType.DEBIT ? amt : -amt);
      }, 0);
    };

    const arStart = await getBalance(arAccount?.id || '', new Date(startDate.getTime() - 1));
    const arEnd = await getBalance(arAccount?.id || '', endDate);
    const arChange = arEnd - arStart; // Increase in Asset = Decrease in Cash

    const apStart = await getBalance(apAccount?.id || '', new Date(startDate.getTime() - 1));
    const apEnd = await getBalance(apAccount?.id || '', endDate);
    const apChange = apEnd - apStart; // Increase in Liability = Increase in Cash

    const operatingCashFlow = netIncome - arChange + apChange;

    return {
      period: { start: startDate, end: endDate },
      netIncome,
      adjustments: {
        accountsReceivable: -arChange,
        accountsPayable: apChange,
      },
      netCashFromOperating: operatingCashFlow,
      generatedAt: new Date().toISOString(),
    };
  }
}
