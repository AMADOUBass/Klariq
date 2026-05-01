import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { parse } from 'csv-parse/sync';
import { DocumentStatus } from '@klariq/db';
import pino from 'pino';

const logger = pino({ name: 'service:bank' });

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  async importStatement(companyId: string, accountId: string, fileBuffer: Buffer, filename: string) {
    // 1. Parse CSV
    let records: any[];
    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException('Failed to parse CSV: ' + err.message);
    }

    // 2. Create Statement record
    const statement = await this.prisma.client.bankStatement.create({
      data: {
        companyId,
        accountId,
        filename,
      },
    });

    // 3. Process Transactions
    const createdCount = 0;
    for (const record of records) {
      // Normalize common headers
      const dateStr = record.Date || record.date || record.DATE;
      const desc = record.Description || record.description || record.DESC || record.Memo || '';
      const amountStr = record.Amount || record.amount || record.AMOUNT || record.Value || record.value;
      const ref = record.Reference || record.reference || record.Ref || null;

      const date = new Date(dateStr);
      const amount = parseFloat(amountStr?.replace(/[^-0-9.]/g, ''));

      if (isNaN(date.getTime()) || isNaN(amount)) {
        logger.warn({ record }, 'Skipping invalid CSV record');
        continue;
      }

      await this.prisma.client.bankTransaction.create({
        data: {
          statementId: statement.id,
          date,
          description: desc,
          amount,
          reference: ref,
        },
      });
    }

    // 4. Trigger Auto-Matching
    const matchedCount = await this.autoMatch(companyId, statement.id);

    return { 
      statementId: statement.id, 
      imported: records.length, 
      matched: matchedCount 
    };
  }

  async autoMatch(companyId: string, statementId: string): Promise<number> {
    const txs = await this.prisma.client.bankTransaction.findMany({
      where: { statementId, isMatched: false },
    });

    let count = 0;
    for (const tx of txs) {
      const amount = tx.amount.toNumber();
      
      if (amount > 0) {
        // Look for Invoices (Sales)
        const match = await this.prisma.client.invoice.findFirst({
          where: {
            companyId,
            status: { in: [DocumentStatus.SENT, DocumentStatus.PENDING] },
            totalAmount: amount,
            date: {
              lte: tx.date,
              gte: new Date(tx.date.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days window
            },
          },
        });

        if (match) {
          await this.prisma.client.bankTransaction.update({
            where: { id: tx.id },
            data: {
              isMatched: true,
              matchedEntityId: match.id,
              matchedEntityType: 'INVOICE',
            },
          });
          count++;
        }
      } else {
        // Look for Bills (Expenses)
        const absAmount = Math.abs(amount);
        const match = await this.prisma.client.bill.findFirst({
          where: {
            companyId,
            status: { in: [DocumentStatus.APPROVED, DocumentStatus.PENDING] },
            totalAmount: absAmount,
            date: {
              lte: tx.date,
              gte: new Date(tx.date.getTime() - 45 * 24 * 60 * 60 * 1000),
            },
          },
        });

        if (match) {
          await this.prisma.client.bankTransaction.update({
            where: { id: tx.id },
            data: {
              isMatched: true,
              matchedEntityId: match.id,
              matchedEntityType: 'BILL',
            },
          });
          count++;
        }
      }
    }
    return count;
  }

  async getTransactions(companyId: string, statementId?: string) {
    return this.prisma.client.bankTransaction.findMany({
      where: { 
        statement: { companyId },
        ...(statementId && { statementId })
      },
      include: {
        statement: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getStatements(companyId: string) {
    return this.prisma.client.bankStatement.findMany({
      where: { companyId },
      include: {
        _count: { select: { transactions: true } }
      },
      orderBy: { importDate: 'desc' },
    });
  }
}
