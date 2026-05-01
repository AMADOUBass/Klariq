import { Module } from '@nestjs/common';
import { TaxReportingService } from './tax-reporting.service';
import { TaxController } from './tax.controller';

@Module({
  controllers: [TaxController],
  providers: [TaxReportingService],
  exports: [TaxReportingService],
})
export class TaxModule {}
