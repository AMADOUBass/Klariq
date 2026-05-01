import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, HttpException } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { FinancialReportingService } from './financial-reporting.service';
import { AuditService, AuditAction } from './audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('accounting')
@UseGuards(AuthGuard, RolesGuard)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly financialReportingService: FinancialReportingService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('audit-logs')
  async getAuditLogs(
    @ActiveTenant() tenant: TenantContext,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      return await this.auditService.getLogs(tenant.companyId, limit, offset);
    } catch (error: any) {
      throw new HttpException(
        'AUDIT_ERROR: ' + error.message + '\nStack: ' + error.stack,
        500
      );
    }
  }

  @Get('export')
  async exportData(@ActiveTenant() tenant: TenantContext) {
    // Export all journal entries and lines as a simple JSON for now
    // In a real app, this would generate a CSV/Excel file stream
    const data = await this.prisma.client.journalEntry.findMany({
      where: { companyId: tenant.companyId },
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'desc' },
    });

    await this.auditService.log({
      companyId: tenant.companyId,
      actorId: tenant.userId,
      action: AuditAction.DATA_EXPORTED,
      entityType: 'Company',
      entityId: tenant.companyId,
    });

    return data;
  }

  @Get('accounts')
  async getAccounts(@ActiveTenant() tenant: TenantContext) {
    return this.accountingService.getChartOfAccounts(tenant.companyId);
  }

  @Get('reports/profit-loss')
  async getPL(
    @ActiveTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financialReportingService.generatePL(
      tenant.companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('reports/balance-sheet')
  async getBalanceSheet(
    @ActiveTenant() tenant: TenantContext,
    @Query('date') date: string,
  ) {
    return this.financialReportingService.generateBalanceSheet(
      tenant.companyId,
      new Date(date),
    );
  }

  @Get('reports/cash-flow')
  async getCashFlow(
    @ActiveTenant() tenant: TenantContext,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financialReportingService.generateCashFlow(
      tenant.companyId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('accounts')
  @Roles('owner', 'admin')
  async createAccount(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountingService.createAccount(tenant.companyId, dto);
  }

  @Post('accounts/seed')
  @Roles('owner', 'admin')
  async seed(@ActiveTenant() tenant: TenantContext) {
    await this.accountingService.seedDefaultAccounts(tenant.companyId, tenant.userId);
    return { message: 'Default chart of accounts seeded' };
  }

  @Get('company')
  async getCompany(@ActiveTenant() tenant: TenantContext) {
    return this.prisma.client.company.findUnique({
      where: { id: tenant.companyId },
    });
  }

  @Patch('company')
  @Roles('owner', 'admin')
  async updateCompany(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: any,
  ) {
    return this.prisma.client.company.update({
      where: { id: tenant.companyId },
      data: {
        legalName: dto.legalName,
        address: dto.address,
        phone: dto.phone,
        logoUrl: dto.logoUrl,
        taxNumberGst: dto.taxNumberGst,
        taxNumberQst: dto.taxNumberQst,
      },
    });
  }

  @Patch('periods/:id/close')
  @Roles('owner', 'admin')
  async closePeriod(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.accountingService.closePeriod(tenant.companyId, id);
  }
}
