import { Controller, Get, Query , UseGuards } from '@nestjs/common';
import { TaxReportingService } from './tax-reporting.service';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Tax')
@Controller('tax')
@UseGuards(AuthGuard)
export class TaxController {
  constructor(private readonly taxReportingService: TaxReportingService) {}

  @Get('report')
  @ApiOperation({ summary: 'Generate a GST/QST tax report' })
  async getReport(
    @ActiveTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.taxReportingService.generateReport(
      tenant.companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
