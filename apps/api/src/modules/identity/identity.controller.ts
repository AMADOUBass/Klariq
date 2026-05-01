import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('identity')
@UseGuards(AuthGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('profile')
  async getProfile(@ActiveTenant() tenant: TenantContext) {
    return this.identityService.getProfile(tenant.userId, tenant.companyId);
  }

  @Patch('profile')
  async updateProfile(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.identityService.updateProfile(tenant.userId, dto);
  }
}
