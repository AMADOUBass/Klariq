import { Controller, Get, UseGuards, Query, HttpException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('reporting/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @ActiveTenant() tenant: TenantContext,
    @Query('period') period?: string,
  ) {
    try {
      return await this.dashboardService.getSummary(tenant.companyId, period || 'YTD');
    } catch (error: any) {
      throw new HttpException(
        'DASHBOARD_ERROR: ' + error.message + '\nStack: ' + error.stack,
        500
      );
    }
  }
}
