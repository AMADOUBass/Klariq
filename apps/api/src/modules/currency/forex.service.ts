import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CurrencyService } from './currency.service';
import { DocumentStatus } from '@klariq/db';
import { Money } from '@klariq/shared';

@Injectable()
export class ForexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Calculates unrealized gains/losses for all open AR (Invoices) and AP (Bills).
   */
  async calculateUnrealizedGainsLosses(companyId: string) {
    const openInvoices = await this.prisma.client.invoice.findMany({
      where: {
        companyId,
        status: { in: [DocumentStatus.SENT, DocumentStatus.PENDING] },
        currency: { not: 'CAD' },
      },
    });

    const openBills = await this.prisma.client.bill.findMany({
      where: {
        companyId,
        status: { in: [DocumentStatus.APPROVED, DocumentStatus.PENDING] },
        currency: { not: 'CAD' },
      },
    });

    const currentRates = new Map<string, number>();
    const now = new Date();

    const results = [];
    let totalUnrealizedGainLoss = 0;

    // Process Invoices (AR)
    for (const inv of openInvoices) {
      if (!currentRates.has(inv.currency)) {
        const rate = await this.currencyService.getExchangeRate(companyId, inv.currency, 'CAD', now);
        currentRates.set(inv.currency, rate);
      }

      const currentRate = currentRates.get(inv.currency)!;
      const originalCadValue = await this.getOriginalCadValue(inv.journalEntryId);
      const currentCadValue = inv.totalAmount.toNumber() * currentRate;
      const unrealized = currentCadValue - originalCadValue;

      results.push({
        type: 'INVOICE',
        id: inv.id,
        number: inv.number,
        currency: inv.currency,
        amount: inv.totalAmount.toNumber(),
        originalRate: originalCadValue / inv.totalAmount.toNumber(),
        currentRate,
        unrealizedGainLoss: unrealized,
      });

      totalUnrealizedGainLoss += unrealized;
    }

    // Process Bills (AP)
    for (const bill of openBills) {
      if (!currentRates.has(bill.currency)) {
        const rate = await this.currencyService.getExchangeRate(companyId, bill.currency, 'CAD', now);
        currentRates.set(bill.currency, rate);
      }

      const currentRate = currentRates.get(bill.currency)!;
      const originalCadValue = await this.getOriginalCadValue(bill.journalEntryId);
      const currentCadValue = bill.totalAmount.toNumber() * currentRate;
      
      // For bills (liabilities), if the CAD value INCREASES, it's a LOSS.
      // So Unrealized = Original - Current
      const unrealized = originalCadValue - currentCadValue;

      results.push({
        type: 'BILL',
        id: bill.id,
        number: bill.number,
        currency: bill.currency,
        amount: bill.totalAmount.toNumber(),
        originalRate: originalCadValue / bill.totalAmount.toNumber(),
        currentRate,
        unrealizedGainLoss: unrealized,
      });

      totalUnrealizedGainLoss += unrealized;
    }

    return {
      date: now.toISOString(),
      totalUnrealizedGainLoss,
      details: results,
    };
  }

  private async getOriginalCadValue(journalEntryId: string | null): Promise<number> {
    if (!journalEntryId) return 0;
    
    const lines = await this.prisma.client.journalLine.findMany({
      where: { 
        journalEntryId,
        // For invoices, AR line is DEBIT. For bills, AP line is CREDIT.
        // We sum all lines in the entry to get the "original" value at the time of posting.
        // Actually, we just need the primary line (AR/AP).
        OR: [
          { account: { code: '1200' } }, // A/R
          { account: { code: '2100' } }, // A/P
        ]
      },
    });

    if (lines.length === 0 || !lines[0]) return 0;
    return lines[0].amountCad.toNumber();
  }
}
