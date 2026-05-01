import { Module } from '@nestjs/common';

/**
 * AccountingModule — Phase 2
 *
 * Responsibilities:
 *  - Chart of accounts (tree structure, account types: asset/liability/equity/revenue/expense)
 *  - Fiscal period management (open, close, lock)
 *  - Journal entry creation and posting
 *  - Double-entry invariant enforcement: SUM(debits) === SUM(credits)
 *
 * Critical invariants (enforced here AND by DB triggers):
 *  1. A posted journal entry is IMMUTABLE. Corrections via reversing entry only.
 *  2. SUM(debit lines) MUST equal SUM(credit lines) — reject if not balanced.
 *  3. All mutations run inside withTransaction() at SERIALIZABLE isolation.
 *  4. Every query filters by company_id — no exceptions.
 *
 * Phase 2 exports: AccountingService, JournalService
 */
import { AccountingService } from './accounting.service';
import { JournalService } from './journal.service';
import { FinancialReportingService } from './financial-reporting.service';
import { AuditService } from './audit.service';
import { AccountingController } from './accounting.controller';
import { JournalController } from './journal.controller';

@Module({
  controllers: [AccountingController, JournalController],
  providers: [AccountingService, JournalService, FinancialReportingService, AuditService],
  exports: [AccountingService, JournalService, FinancialReportingService, AuditService],
})
export class AccountingModule {}
