import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { JournalService } from '../accounting/journal.service';
import { Money } from '@klariq/shared';
import { DocumentStatus, EntryLineType, JournalEntryType } from '@klariq/db';

import { AuditService, AuditAction } from '../accounting/audit.service';

@Injectable()
export class BillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves a single bill by ID.
   */
  async getBill(companyId: string, id: string) {
    const bill = await this.prisma.client.bill.findUnique({
      where: { id, companyId },
      include: { contact: true, lines: true },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  /**
   * Lists all bills for a company.
   */
  async getBills(companyId: string) {
    return this.prisma.client.bill.findMany({
      where: { companyId },
      include: { contact: true, lines: true },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Creates a draft bill.
   */
  async createBill(companyId: string, dto: any) {
    // Similar to Invoice but for Suppliers
    const { totalAmount, totalTax, linesWithAmounts } = await this.calculateTotals(companyId, dto.lines, dto.currency);

    return this.prisma.client.bill.create({
      data: {
        companyId,
        contactId: dto.contactId,
        number: dto.number,
        date: new Date(dto.date),
        dueDate: new Date(dto.dueDate),
        currency: dto.currency,
        totalAmount: totalAmount.amount,
        totalTax: totalTax.amount,
        status: DocumentStatus.DRAFT,
        lines: {
          create: linesWithAmounts,
        },
      },
    });
  }

  /**
   * Approves a bill and creates a corresponding journal entry.
   */
  async approveBill(companyId: string, userId: string, billId: string) {
    const bill = await this.prisma.client.bill.findUnique({
      where: { id: billId, companyId },
      include: { lines: true },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only draft bills can be approved');

    const apAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2100' } });
    const expenseAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '5100' } });
    const itcAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2311' } });
    const itrAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2321' } });

    if (!apAccount || !expenseAccount) {
      throw new BadRequestException('Standard accounting configuration (A/P, Expense accounts) missing');
    }

    const journalLines: any[] = [
      {
        accountId: apAccount.id,
        type: EntryLineType.CREDIT,
        amount: bill.totalAmount.toString(),
        currency: bill.currency,
        description: `Bill ${bill.number}`,
      }
    ];

    // Calculate split for expense and taxes
    let expenseSum = Money.zero(bill.currency as any);
    let itcSum = Money.zero(bill.currency as any);
    let itrSum = Money.zero(bill.currency as any);

    for (const line of (bill as any).lines) {
      const qty = parseFloat(line.quantity);
      const unitPrice = Money.of(line.unitPrice, bill.currency as any);
      const lineSubtotal = unitPrice.multiply(qty);
      expenseSum = expenseSum.add(lineSubtotal);

      if (line.taxRateId) {
        const rate = await this.prisma.client.taxRate.findUnique({ where: { id: line.taxRateId } });
        const lineTotal = Money.of(line.amount, bill.currency as any);
        const lineTax = lineTotal.subtract(lineSubtotal);

        if (rate?.code === 'GST_QST') {
          const gstRatio = 0.05 / 0.14975;
          const gstAmount = lineTax.multiply(gstRatio);
          const qstAmount = lineTax.subtract(gstAmount);
          itcSum = itcSum.add(gstAmount);
          itrSum = itrSum.add(qstAmount);
        } else if (rate?.code === 'GST') {
          itcSum = itcSum.add(lineTax);
        } else if (rate?.code === 'QST') {
          itrSum = itrSum.add(lineTax);
        }
      }
    }

    // Add Expense Line (Debit)
    journalLines.push({
      accountId: expenseAccount.id,
      type: EntryLineType.DEBIT,
      amount: expenseSum.amount.toString(),
      currency: bill.currency,
      description: `Expense: Bill ${bill.number}`,
    });

    // Add ITC Line (Debit)
    if (!itcSum.isZero()) {
      journalLines.push({
        accountId: itcAccount?.id ?? apAccount.id,
        type: EntryLineType.DEBIT,
        amount: itcSum.amount.toString(),
        currency: bill.currency,
        description: `ITC: Bill ${bill.number}`,
      });
    }

    // Add ITR Line (Debit)
    if (!itrSum.isZero()) {
      journalLines.push({
        accountId: itrAccount?.id ?? apAccount.id,
        type: EntryLineType.DEBIT,
        amount: itrSum.amount.toString(),
        currency: bill.currency,
        description: `ITR: Bill ${bill.number}`,
      });
    }

    const entry = await this.journalService.createEntry(companyId, userId, {
      date: bill.date.toISOString(),
      type: JournalEntryType.BILL,
      description: `Approving Bill ${bill.number}`,
      reference: bill.number,
      lines: journalLines,
    });

    await this.journalService.postEntry(companyId, entry.id);

    const updatedBill = await this.prisma.client.bill.update({
      where: { id: billId },
      data: {
        status: DocumentStatus.APPROVED,
        journalEntryId: entry.id,
      },
    });

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.BILL_APPROVED,
      entityType: 'Bill',
      entityId: bill.id,
      after: { billNumber: bill.number },
    });

    return updatedBill;
  }

  /**
   * Records a payment for a bill.
   */
  async payBill(companyId: string, userId: string, billId: string, accountId: string) {
    const bill = await this.prisma.client.bill.findUnique({
      where: { id: billId, companyId },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== DocumentStatus.APPROVED) throw new BadRequestException('Only approved bills can be paid');

    const apAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2100' } });
    if (!apAccount) throw new BadRequestException('A/P account missing');

    const entry = await this.journalService.createEntry(companyId, userId, {
      date: new Date().toISOString(),
      type: JournalEntryType.PAYMENT,
      description: `Payment for Bill ${bill.number}`,
      reference: bill.number,
      lines: [
        {
          accountId: apAccount.id,
          type: EntryLineType.DEBIT, // Reduce liability
          amount: bill.totalAmount.toString(),
          currency: bill.currency,
        },
        {
          accountId, // The bank/cash account
          type: EntryLineType.CREDIT, // Reduce asset
          amount: bill.totalAmount.toString(),
          currency: bill.currency,
        }
      ],
    });

    await this.journalService.postEntry(companyId, entry.id);

    const updatedBill = await this.prisma.client.bill.update({
      where: { id: billId },
      data: { status: DocumentStatus.PAID },
    });

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.BILL_PAID,
      entityType: 'Bill',
      entityId: bill.id,
      after: { billNumber: bill.number, paymentAccountId: accountId },
    });

    return updatedBill;
  }

  /**
   * Updates a draft bill.
   */
  async updateBill(companyId: string, userId: string, billId: string, dto: any) {
    const bill = await this.prisma.client.bill.findUnique({
      where: { id: billId, companyId },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft bills can be updated');
    }

    const { totalAmount, totalTax, linesWithAmounts } = await this.calculateTotals(companyId, dto.lines, dto.currency);

    // Delete existing lines and recreate
    await this.prisma.client.billLine.deleteMany({ where: { billId } });

    const updated = await this.prisma.client.bill.update({
      where: { id: billId },
      data: {
        contactId: dto.contactId,
        number: dto.number,
        date: new Date(dto.date),
        dueDate: new Date(dto.dueDate),
        currency: dto.currency,
        totalAmount: totalAmount.amount,
        totalTax: totalTax.amount,
        lines: {
          create: linesWithAmounts,
        },
      },
    });

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.BILL_UPDATED,
      entityType: 'Bill',
      entityId: updated.id,
      after: { billNumber: updated.number },
    });

    return updated;
  }

  /**
   * Deletes a draft bill.
   */
  async deleteBill(companyId: string, userId: string, billId: string) {
    const bill = await this.prisma.client.bill.findUnique({
      where: { id: billId, companyId },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft bills can be deleted');
    }

    await this.prisma.client.billLine.deleteMany({ where: { billId } });
    await this.prisma.client.bill.delete({ where: { id: billId } });

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.BILL_DELETED,
      entityType: 'Bill',
      entityId: billId,
      before: { billNumber: bill.number },
    });

    return { success: true };
  }

  private async calculateTotals(companyId: string, lines: any[], currency: string) {
    let totalAmount = Money.zero(currency as any);
    let totalTax = Money.zero(currency as any);
    const linesWithAmounts = [];

    for (const line of lines) {
      const qty = parseFloat(line.quantity);
      const price = Money.of(line.unitPrice, currency as any);
      const lineAmount = price.multiply(qty);
      
      let lineTax = Money.zero(currency as any);
      if (line.taxRateId) {
        const rate = await this.prisma.client.taxRatePeriod.findFirst({
          where: { taxRateId: line.taxRateId, effectiveFrom: { lte: new Date() } },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (rate) {
          lineTax = lineAmount.multiply(rate.rate.toNumber());
        }
      }

      totalAmount = totalAmount.add(lineAmount).add(lineTax);
      totalTax = totalTax.add(lineTax);

      linesWithAmounts.push({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRateId: line.taxRateId,
        amount: lineAmount.add(lineTax).amount,
      });
    }

    return { totalAmount, totalTax, linesWithAmounts };
  }
}
