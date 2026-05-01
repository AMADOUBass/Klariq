import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AccountType, EntryLineType } from '@klariq/db';
import { Money } from '@klariq/shared';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the balance for a specific account.
   */
  async getAccountBalance(companyId: string, accountId: string, periodId?: string) {
    const lines = await this.prisma.client.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          companyId,
          periodId,
          isPosted: true, // Only posted entries count towards balance
        },
      },
      include: {
        journalEntry: true,
        account: true,
      },
    });

    if (lines.length === 0) return Money.zero('CAD');

    const accountType = lines[0]!.account.type;
    let balance = Money.zero('CAD');

    for (const line of lines) {
      const amount = Money.of(line.amountCad, 'CAD'); // Use CAD for ledger balance
      
      if (this.isIncrease(accountType, line.type)) {
        balance = balance.add(amount);
      } else {
        balance = balance.subtract(amount);
      }
    }

    return balance;
  }

  /**
   * Generates a Trial Balance report.
   */
  async getTrialBalance(companyId: string, periodId: string) {
    const accounts = await this.prisma.client.account.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
    });

    const report = [];

    for (const account of accounts) {
      const balance = await this.getAccountBalance(companyId, account.id, periodId);
      report.push({
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balance: balance.toDTO(),
      });
    }

    return report;
  }

  /**
   * Generates a Balance Sheet.
   */
  async getBalanceSheet(companyId: string, periodId: string) {
    const trialBalance = await this.getTrialBalance(companyId, periodId);

    const assets = trialBalance.filter(a => a.type === AccountType.ASSET);
    const liabilities = trialBalance.filter(a => a.type === AccountType.LIABILITY);
    const equity = trialBalance.filter(a => a.type === AccountType.EQUITY);

    return {
      periodId,
      assets: {
        items: assets,
        total: this.sumBalances(assets).toDTO(),
      },
      liabilities: {
        items: liabilities,
        total: this.sumBalances(liabilities).toDTO(),
      },
      equity: {
        items: equity,
        total: this.sumBalances(equity).toDTO(),
      },
    };
  }

  /**
   * Generates an Income Statement (P&L).
   */
  async getIncomeStatement(companyId: string, periodId: string) {
    const trialBalance = await this.getTrialBalance(companyId, periodId);

    const revenue = trialBalance.filter(a => a.type === AccountType.REVENUE);
    const expenses = trialBalance.filter(a => a.type === AccountType.EXPENSE);

    const totalRevenue = this.sumBalances(revenue);
    const totalExpenses = this.sumBalances(expenses);
    const netIncome = totalRevenue.subtract(totalExpenses);

    return {
      periodId,
      revenue: {
        items: revenue,
        total: totalRevenue.toDTO(),
      },
      expenses: {
        items: expenses,
        total: totalExpenses.toDTO(),
      },
      netIncome: netIncome.toDTO(),
    };
  }

  /**
   * Accounting logic: Does this line type increase this account type?
   */
  private isIncrease(accountType: AccountType, lineType: EntryLineType): boolean {
    switch (accountType) {
      case AccountType.ASSET:
      case AccountType.EXPENSE:
        return lineType === EntryLineType.DEBIT;
      case AccountType.LIABILITY:
      case AccountType.EQUITY:
      case AccountType.REVENUE:
        return lineType === EntryLineType.CREDIT;
      default:
        return false;
    }
  }

  private sumBalances(items: any[]): Money {
    return items.reduce(
      (sum, item) => sum.add(Money.fromDTO(item.balance)),
      Money.zero('CAD')
    );
  }
}
