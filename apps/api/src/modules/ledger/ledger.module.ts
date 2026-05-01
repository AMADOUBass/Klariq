import { Module } from '@nestjs/common';

/**
 * LedgerModule — Phase 2
 *
 * Responsibilities:
 *  - General ledger (trial balance, balance sheet, income statement)
 *  - Account balance calculation (sum of journal lines per account)
 *  - Multi-currency ledger (CAD functional currency, with exchange rate application)
 *  - Period-end closing procedures
 *
 * The ledger is READ-ONLY from an API perspective. All writes go through
 * AccountingModule which posts journal entries. LedgerModule only queries.
 *
 * Phase 2 exports: LedgerService (for reporting queries)
 */
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
