import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Money } from '@klariq/shared';
import { EntryLineType } from '@klariq/db';
import type { CreateJournalEntryDto } from './dto/create-journal-entry.dto';

import { CurrencyService } from '../currency/currency.service';

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Creates a draft journal entry.
   * Enforces double-entry balance: SUM(debit) === SUM(credit).
   */
  async createEntry(companyId: string, userId: string, dto: CreateJournalEntryDto) {
    // 1. Validate balance
    this.validateBalance(dto.lines);

    // 2. Find active period for the date
    const period = await this.prisma.client.fiscalPeriod.findFirst({
      where: {
        companyId,
        startDate: { lte: new Date(dto.date) },
        endDate: { gte: new Date(dto.date) },
        status: 'OPEN',
      },
    });

    if (!period) {
      throw new BadRequestException('No open fiscal period found for this date');
    }

    // 3. Create entry and lines in a transaction
    return this.prisma.client.$transaction(async (tx: any) => {
      // Fetch rates for all unique currencies in the entry
      const currencies = [...new Set(dto.lines.map((l) => l.currency))];
      const rateMap = new Map<string, number>();
      
      for (const cur of currencies) {
        const rate = await this.currencyService.getExchangeRate(
          companyId,
          cur,
          'CAD',
          new Date(dto.date)
        );
        rateMap.set(cur, rate);
      }

      const entry = await tx.journalEntry.create({
        data: {
          companyId,
          periodId: period.id,
          date: new Date(dto.date),
          type: dto.type,
          description: dto.description,
          reference: dto.reference,
          createdBy: userId,
          lines: {
            create: dto.lines.map((l) => {
              const rate = rateMap.get(l.currency) || 1.0;
              const amount = Money.of(l.amount, l.currency as any);
              const amountCad = amount.multiply(rate);

              return {
                accountId: l.accountId,
                type: l.type,
                amount: l.amount,
                currency: l.currency,
                amountCad: amountCad.amount.toString(),
                exchangeRate: rate.toString(),
                description: l.description,
              };
            }),
          },
        },
        include: { lines: true },
      });

      return entry;
    });
  }

  /**
   * Posts a draft entry, making it immutable.
   */
  async postEntry(companyId: string, entryId: string) {
    const entry = await this.prisma.client.journalEntry.findUnique({
      where: { id: entryId, companyId },
    });

    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.isPosted) throw new BadRequestException('Entry already posted');

    return this.prisma.client.journalEntry.update({
      where: { id: entryId },
      data: {
        isPosted: true,
        postedAt: new Date(),
      },
    });
  }

  /**
   * Creates a reversing entry for a posted entry.
   * This is the ONLY way to "correct" a posted entry.
   */
  async reverseEntry(companyId: string, userId: string, entryId: string) {
    const original = await this.prisma.client.journalEntry.findUnique({
      where: { id: entryId, companyId },
      include: { lines: true },
    });

    if (!original) throw new NotFoundException('Original entry not found');
    if (!original.isPosted) throw new BadRequestException('Can only reverse posted entries');

    // Create a new entry with swapped Debit/Credit
    return this.prisma.client.$transaction(async (tx: any) => {
      const reversal = await tx.journalEntry.create({
        data: {
          companyId,
          periodId: original.periodId,
          date: new Date(), // Reversal happens now
          type: 'SYSTEM',
          description: `REVERSAL of entry ${original.id}: ${original.description}`,
          reference: `REV-${original.reference ?? original.id}`,
          createdBy: userId,
          lines: {
            create: original.lines.map((l: any) => ({
              accountId: l.accountId,
              // Swap type: DEBIT -> CREDIT, CREDIT -> DEBIT
              type: l.type === EntryLineType.DEBIT ? EntryLineType.CREDIT : EntryLineType.DEBIT,
              amount: l.amount,
              currency: l.currency,
              amountCad: l.amountCad,
              exchangeRate: l.exchangeRate,
              description: `Reverse: ${l.description ?? ''}`,
            })),
          },
        },
        include: { lines: true },
      });

      // Auto-post the reversal
      await tx.journalEntry.update({
        where: { id: reversal.id },
        data: { isPosted: true, postedAt: new Date() },
      });

      return reversal;
    });
  }

  /**
   * Internal balance validator using Money value object.
   */
  private validateBalance(lines: any[]) {
    let balance = Money.zero('CAD'); // Base for comparison

    for (const line of lines) {
      const amount = Money.of(line.amount, line.currency as any);
      if (line.type === EntryLineType.DEBIT) {
        balance = balance.add(amount);
      } else {
        balance = balance.subtract(amount);
      }
    }

    if (!balance.isZero()) {
      throw new BadRequestException(`Unbalanced entry: discrepancy of ${balance.toString()}`);
    }
  }
}
