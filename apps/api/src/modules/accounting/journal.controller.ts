import { Controller, Post, Body, Param, Patch , UseGuards } from '@nestjs/common';
import { JournalService } from './journal.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('accounting/journal')
@UseGuards(AuthGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post('entries')
  async createEntry(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.journalService.createEntry(tenant.companyId, tenant.userId, dto);
  }

  @Patch('entries/:id/post')
  async postEntry(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.journalService.postEntry(tenant.companyId, id);
  }

  @Post('entries/:id/reverse')
  async reverseEntry(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.journalService.reverseEntry(tenant.companyId, tenant.userId, id);
  }
}
