import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AccountType, DocumentStatus, EntryLineType } from '@klariq/db';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string, period: string = 'YTD') {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), 0, 1); // YTD default
    
    if (period === 'MTD') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'QTD') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
    }
    // 1. Get Cash Balance (Account 1010)
    const cashAccounts = await this.prisma.client.account.findMany({
      where: { companyId, code: { startsWith: '101' } },
    });
    
    let cashBalance = 0;
    for (const acc of cashAccounts) {
      const balance = await this.prisma.client.journalLine.aggregate({
        where: { accountId: acc.id, journalEntry: { isPosted: true } },
        _sum: { amount: true },
      });
      cashBalance += Number(balance._sum.amount || 0);
    }

    // 2. Get AR Aging (Accounts Receivable)
    const arInvoices = await this.prisma.client.invoice.findMany({
      where: { companyId, status: { in: [DocumentStatus.SENT, DocumentStatus.PENDING] } },
    });

    const totalAR = arInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount), 0);

    // 3. Get AP Aging (Accounts Payable)
    const apBills = await this.prisma.client.bill.findMany({
      where: { companyId, status: { in: [DocumentStatus.SENT, DocumentStatus.PENDING, DocumentStatus.APPROVED] } },
    });

    const totalAP = apBills.reduce((sum: number, bill: any) => sum + Number(bill.totalAmount), 0);

    // 4. Net Profit (Revenue - Expenses)
    const revenue = await this.prisma.client.account.findMany({
      where: { companyId, type: AccountType.REVENUE },
    });
    const expenses = await this.prisma.client.account.findMany({
      where: { companyId, type: AccountType.EXPENSE },
    });

    let totalRevenue = 0;
    for (const acc of revenue) {
       const balance = await this.prisma.client.journalLine.aggregate({
        where: { accountId: acc.id, journalEntry: { isPosted: true, date: { gte: startDate } } },
        _sum: { amount: true },
      });
      totalRevenue += Number(balance._sum.amount || 0);
    }

    let totalExpenses = 0;
    for (const acc of expenses) {
       const balance = await this.prisma.client.journalLine.aggregate({
        where: { accountId: acc.id, journalEntry: { isPosted: true, date: { gte: startDate } } },
        _sum: { amount: true },
      });
      totalExpenses += Number(balance._sum.amount || 0);
    }

    // 5. Monthly Data for P&L Chart (Last 4 months)
    const plMonthly = await this.getPLMonthly(companyId);

    // 6. Recent Activity
    const recentEntries = await this.prisma.client.journalEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        lines: true,
        invoice: true,
        bill: true,
      }
    });

    const recentActivity = recentEntries.map((entry: any) => {
      let type = 'je';
      let title = entry.description;
      let meta = entry.reference || 'Manual Entry';
      let amount = Number(entry.lines.find((l: any) => l.type === EntryLineType.CREDIT)?.amount || 0);
      let status = entry.isPosted ? 'posted' : 'review';

      if (entry.invoice) {
        type = 'ar';
        title = `Invoice ${entry.invoice.number}`;
        meta = 'Customer Invoice';
        amount = Number(entry.invoice.totalAmount);
        status = entry.invoice.status === DocumentStatus.SENT ? 'sent' : 'review';
      } else if (entry.bill) {
        type = 'ap';
        title = `Bill ${entry.bill.number}`;
        meta = 'Vendor Bill';
        amount = -Number(entry.bill.totalAmount);
        status = entry.bill.status === DocumentStatus.APPROVED ? 'approved' : 'review';
      }

      return {
        id: (entry.id.split('-')[0] || entry.id).toUpperCase(),
        type,
        title,
        meta,
        amount,
        status,
        time: entry.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        flag: !entry.isPosted
      };
    });

    return {
      kpis: {
        cash: cashBalance,
        ar: totalAR,
        ap: totalAP,
        netProfit: totalRevenue - totalExpenses,
      },
      aging: {
        ar: this.calculateAging(arInvoices),
        ap: this.calculateAging(apBills),
      },
      plMonthly,
      recentActivity
    };
  }

  private async getPLMonthly(companyId: string) {
    const months = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const revenue = await this.prisma.client.journalLine.aggregate({
        where: { 
          account: { companyId, type: AccountType.REVENUE },
          journalEntry: { date: { gte: start, lte: end }, isPosted: true }
        },
        _sum: { amount: true },
      });

      const expenses = await this.prisma.client.journalLine.aggregate({
        where: { 
          account: { companyId, type: AccountType.EXPENSE },
          journalEntry: { date: { gte: start, lte: end }, isPosted: true }
        },
        _sum: { amount: true },
      });

      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue: Number(revenue._sum.amount || 0),
        expenses: Number(expenses._sum.amount || 0),
      });
    }
    return months;
  }

  private calculateAging(documents: any[]) {
    const now = new Date();
    const buckets = {
      current: 0,
      b30: 0,
      b60: 0,
      b90: 0,
      b90p: 0,
    };

    for (const doc of documents) {
      const dueDate = new Date(doc.dueDate);
      const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) buckets.current += Number(doc.totalAmount);
      else if (diffDays <= 30) buckets.b30 += Number(doc.totalAmount);
      else if (diffDays <= 60) buckets.b60 += Number(doc.totalAmount);
      else if (diffDays <= 90) buckets.b90 += Number(doc.totalAmount);
      else buckets.b90p += Number(doc.totalAmount);
    }

    return buckets;
  }
}
