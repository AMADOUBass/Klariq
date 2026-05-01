import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { JournalService } from '../accounting/journal.service';
import { Money } from '@klariq/shared';
import { DocumentStatus, EntryLineType, JournalEntryType } from '@klariq/db';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';

import { Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { INVOICE_EMAIL_QUEUE } from '../../queues/queues.module';

import { AuditService, AuditAction } from '../accounting/audit.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly auditService: AuditService,
    @Inject(`QUEUE:${INVOICE_EMAIL_QUEUE}`)
    private readonly invoiceEmailQueue: Queue,
  ) {}

  /**
   * Lists all invoices for a company.
   */
  async getInvoices(companyId: string) {
    return this.prisma.client.invoice.findMany({
      where: { companyId },
      include: { contact: true, lines: true },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Enqueues an invoice email job.
   */
  async sendInvoiceEmail(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { id: invoiceId, companyId },
      include: { contact: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.contact.email) {
      throw new BadRequestException('Contact does not have an email address');
    }

    await this.invoiceEmailQueue.add(
      'send-invoice',
      {
        idempotencyKey: `invoice-email-${invoice.id}-${Date.now()}`,
        invoiceId: invoice.id,
        email: invoice.contact.email,
        invoiceNumber: invoice.number,
        totalAmount: invoice.totalAmount.toNumber(),
        locale: 'fr', // Defaulting to FR for now, could be derived from contact/company
      },
      {
        jobId: `invoice-email-${invoice.id}`, // Deduplication per invoice if needed
      },
    );

    return { success: true };
  }

  /**
   * Creates a draft invoice.
   */
  async createInvoice(companyId: string, dto: CreateInvoiceDto) {
    // 1. Calculate totals
    const { totalAmount, totalTax, linesWithAmounts } = await this.calculateTotals(companyId, dto.lines, dto.currency);

    // 2. Create invoice
    return this.prisma.client.invoice.create({
      data: {
        companyId,
        contactId: dto.contactId,
        number: dto.number,
        date: new Date(dto.date),
        dueDate: new Date(dto.dueDate),
        currency: dto.currency,
        totalAmount: totalAmount.amount,
        totalTax: totalTax.amount,
        notes: dto.notes,
        status: DocumentStatus.DRAFT,
        lines: {
          create: linesWithAmounts,
        },
      },
      include: { lines: true, contact: true },
    });
  }

  /**
   * Posts an invoice and creates a corresponding journal entry.
   */
  async postInvoice(companyId: string, invoiceId: string, userId?: string) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { id: invoiceId, companyId },
      include: { lines: { include: { taxRate: true } } },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only draft invoices can be posted');

    // 1. Prepare journal entry lines
    // We need to resolve standard accounts (e.g., 1200 for A/R, 4100 for Sales)
    const arAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '1200' } });
    const salesAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '4100' } });
    const gstAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2310' } });
    const qstAccount = await this.prisma.client.account.findFirst({ where: { companyId, code: '2320' } });

    if (!arAccount || !salesAccount) {
      throw new BadRequestException('Standard accounting configuration (A/R, Sales accounts) missing');
    }

    const journalLines: any[] = [
      {
        accountId: arAccount.id,
        type: EntryLineType.DEBIT,
        amount: invoice.totalAmount.toString(),
        currency: invoice.currency,
        description: `Invoice ${invoice.number}`,
      },
    ];

    // Split revenue and taxes
    let revenueSum = Money.zero(invoice.currency as any);
    let gstSum = Money.zero(invoice.currency as any);
    let qstSum = Money.zero(invoice.currency as any);

    for (const line of invoice.lines) {
      const qty = line.quantity.toNumber();
      const unitPrice = Money.of(line.unitPrice, invoice.currency as any);
      const lineSubtotal = unitPrice.multiply(qty);
      revenueSum = revenueSum.add(lineSubtotal);

      if (line.taxRate) {
        const lineTotal = Money.of(line.amount, invoice.currency as any);
        const lineTax = lineTotal.subtract(lineSubtotal);

        if (line.taxRate.code === 'GST_QST') {
          // Standard Quebec split: 5% GST, 9.975% QST
          // 5 / 14.975 = ~33.38% of total tax is GST
          const gstRatio = 0.05 / 0.14975;
          const gstAmount = lineTax.multiply(gstRatio);
          const qstAmount = lineTax.subtract(gstAmount);
          
          gstSum = gstSum.add(gstAmount);
          qstSum = qstSum.add(qstAmount);
        } else if (line.taxRate.code === 'GST') {
          gstSum = gstSum.add(lineTax);
        } else if (line.taxRate.code === 'QST') {
          qstSum = qstSum.add(lineTax);
        }
      }
    }

    // Add Sales Revenue (Credit)
    journalLines.push({
      accountId: salesAccount.id,
      type: EntryLineType.CREDIT,
      amount: revenueSum.amount.toString(),
      currency: invoice.currency,
      description: `Sales: Invoice ${invoice.number}`,
    });

    // Add GST (Credit)
    if (!gstSum.isZero()) {
      journalLines.push({
        accountId: gstAccount?.id ?? arAccount.id,
        type: EntryLineType.CREDIT,
        amount: gstSum.amount.toString(),
        currency: invoice.currency,
        description: `GST: Invoice ${invoice.number}`,
      });
    }

    // Add QST (Credit)
    if (!qstSum.isZero()) {
      journalLines.push({
        accountId: qstAccount?.id ?? arAccount.id,
        type: EntryLineType.CREDIT,
        amount: qstSum.amount.toString(),
        currency: invoice.currency,
        description: `QST: Invoice ${invoice.number}`,
      });
    }

    // 2. Create Journal Entry
    const entry = await this.journalService.createEntry(companyId, userId || 'system', {
      date: invoice.date.toISOString(),
      type: JournalEntryType.INVOICE,
      description: `Posting Invoice ${invoice.number}`,
      reference: invoice.number,
      lines: journalLines,
    });

    // 3. Post Journal Entry
    await this.journalService.postEntry(companyId, entry.id);

    // 4. Update Invoice Status
    const updatedInvoice = await this.prisma.client.invoice.update({
      where: { id: invoiceId },
      data: {
        status: DocumentStatus.SENT,
        journalEntryId: entry.id,
      },
    });

    if (userId) {
      await this.auditService.log({
        companyId,
        actorId: userId,
        action: AuditAction.INVOICE_POSTED,
        entityType: 'Invoice',
        entityId: invoice.id,
        after: { invoiceNumber: invoice.number },
      });
    }

    return updatedInvoice;
  }

  /**
   * Updates a draft invoice.
   */
  async updateInvoice(companyId: string, userId: string, invoiceId: string, dto: CreateInvoiceDto) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { id: invoiceId, companyId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    const { totalAmount, totalTax, linesWithAmounts } = await this.calculateTotals(companyId, dto.lines, dto.currency);

    // Recreate lines
    await this.prisma.client.invoiceLine.deleteMany({ where: { invoiceId } });

    const updated = await this.prisma.client.invoice.update({
      where: { id: invoiceId },
      data: {
        contactId: dto.contactId,
        number: dto.number,
        date: new Date(dto.date),
        dueDate: new Date(dto.dueDate),
        currency: dto.currency,
        totalAmount: totalAmount.amount,
        totalTax: totalTax.amount,
        notes: dto.notes,
        lines: {
          create: linesWithAmounts,
        },
      },
    });

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.INVOICE_UPDATED,
      entityType: 'Invoice',
      entityId: updated.id,
      after: { invoiceNumber: updated.number },
    });

    return updated;
  }

  /**
   * Deletes a draft invoice.
   */
  async deleteInvoice(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { id: invoiceId, companyId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.prisma.client.invoiceLine.deleteMany({ where: { invoiceId } });
    await this.prisma.client.invoice.delete({ where: { id: invoiceId } });

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.INVOICE_DELETED,
      entityType: 'Invoice',
      entityId: invoiceId,
      before: { invoiceNumber: invoice.number },
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
        amount: lineAmount.add(lineTax).amount, // Store gross amount
      });
    }

    return { totalAmount, totalTax, linesWithAmounts };
  }
}
