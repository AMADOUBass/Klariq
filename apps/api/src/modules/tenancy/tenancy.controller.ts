import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenancyService } from './tenancy.service';
import { OnboardCompanyDto } from '../identity/dto/onboard-company.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';

@Controller('tenancy')
@UseGuards(AuthGuard)
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get('company')
  async getCompany(@ActiveTenant() tenant: TenantContext) {
    return this.tenancyService.getCompany(tenant.companyId);
  }

  @Post('onboard')
  async onboard(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: OnboardCompanyDto,
  ) {
    return this.tenancyService.onboardCompany(tenant.companyId, dto);
  }

  @Post('invite')
  async invite(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: InviteMemberDto,
  ) {
    return this.tenancyService.inviteMember(tenant.companyId, dto);
  }
}
