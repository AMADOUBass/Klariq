import { Controller, Get, Query , UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { type TenantContext } from '../../common/context/tenant.context';

@Controller('audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(
    @ActiveTenant() tenant: TenantContext,
    @Query() query: GetAuditLogsDto,
  ) {
    return this.auditService.getLogs(tenant.companyId, query);
  }
}
