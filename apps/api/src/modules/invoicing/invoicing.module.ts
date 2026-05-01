import { Module } from '@nestjs/common';

/**
 * InvoicingModule — Phase 2
 *
 * Responsibilities:
 *  - Customer invoices (AR) — draft, send, void, mark paid
 *  - Vendor bills (AP) — create, approve, pay
 *  - Automatic journal entry creation on invoice posting
 *  - GST/QST tax line calculation using time-versioned TaxRates
 *  - PDF generation (Phase 3 — delegated to a background job)
 *
 * Tax resolution rule:
 *  Tax rates are ALWAYS resolved by the invoice date, never today's date.
 *  See docs/CLAUDE.md for the hard rule on time-versioned tax rates.
 *
 * Phase 2 exports: InvoicingService
 */
import { ContactService } from './contact.service';
import { InvoiceService } from './invoice.service';
import { BillService } from './bill.service';
import { InvoicingController } from './invoicing.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { QueuesModule } from '../../queues/queues.module';

@Module({
  imports: [AccountingModule, QueuesModule],
  controllers: [InvoicingController],
  providers: [ContactService, InvoiceService, BillService],
  exports: [ContactService, InvoiceService, BillService],
})
export class InvoicingModule {}
