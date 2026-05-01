import { Controller, Get, Query , UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('ledger')
@UseGuards(AuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('trial-balance')
  async getTrialBalance(
    @ActiveTenant() tenant: TenantContext,
    @Query('periodId') periodId: string,
  ) {
    return this.ledgerService.getTrialBalance(tenant.companyId, periodId);
  }

  @Get('balance-sheet')
  async getBalanceSheet(
    @ActiveTenant() tenant: TenantContext,
    @Query('periodId') periodId: string,
  ) {
    return this.ledgerService.getBalanceSheet(tenant.companyId, periodId);
  }

  @Get('income-statement')
  async getIncomeStatement(
    @ActiveTenant() tenant: TenantContext,
    @Query('periodId') periodId: string,
  ) {
    return this.ledgerService.getIncomeStatement(tenant.companyId, periodId);
  }
}
