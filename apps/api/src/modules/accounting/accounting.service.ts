import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AccountType } from '@klariq/db';
import type { CreateAccountDto } from './dto/create-account.dto';

import { AuditService, AuditAction } from './audit.service';

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a new account in the chart of accounts.
   */
  async createAccount(companyId: string, dto: CreateAccountDto) {
    const existing = await this.prisma.client.account.findFirst({
      where: { companyId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Account code ${dto.code} already exists`);
    }

    return this.prisma.client.account.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        isSystem: dto.isSystem ?? false,
      },
    });
  }

  /**
   * Returns the full chart of accounts for a company.
   */
  async getChartOfAccounts(companyId: string) {
    return this.prisma.client.account.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
      include: { children: true },
    });
  }

  /**
   * Seeds the default Quebec Chart of Accounts for a new company.
   */
  async seedDefaultAccounts(companyId: string, userId: string = 'system') {
    const defaults = [
      { code: '1000', name: 'ACTIF', type: AccountType.ASSET },
      { code: '1010', name: 'Encaisse (Banque)', type: AccountType.ASSET, parentCode: '1000' },
      { code: '1200', name: 'Comptes clients', type: AccountType.ASSET, parentCode: '1000' },
      { code: '2000', name: 'PASSIF', type: AccountType.LIABILITY },
      { code: '2100', name: 'Comptes fournisseurs', type: AccountType.LIABILITY, parentCode: '2000' },
      { code: '2310', name: 'TPS Collectée', type: AccountType.LIABILITY, parentCode: '2000' },
      { code: '2311', name: 'TPS Payée (CTI)', type: AccountType.LIABILITY, parentCode: '2000' },
      { code: '2320', name: 'TVQ Collectée', type: AccountType.LIABILITY, parentCode: '2000' },
      { code: '2321', name: 'TVQ Payée (RTI)', type: AccountType.LIABILITY, parentCode: '2000' },
      { code: '3000', name: 'CAPITAUX PROPRES', type: AccountType.EQUITY },
      { code: '3100', name: 'Bénéfices non répartis', type: AccountType.EQUITY, parentCode: '3000' },
      { code: '4000', name: 'REVENUS', type: AccountType.REVENUE },
      { code: '4100', name: 'Ventes de services', type: AccountType.REVENUE, parentCode: '4000' },
      { code: '5000', name: 'DÉPENSES', type: AccountType.EXPENSE },
      { code: '5100', name: 'Achats de fournitures', type: AccountType.EXPENSE, parentCode: '5000' },
    ];

    // Simple sequential seed to maintain parent/child relations
    for (const item of defaults) {
      const parent = item.parentCode 
        ? await this.prisma.client.account.findFirst({ where: { companyId, code: item.parentCode } })
        : null;

      await this.createAccount(companyId, {
        code: item.code,
        name: item.name,
        type: item.type,
        parentId: parent?.id,
        isSystem: true,
      });
    }

    await this.seedTaxRates(companyId);

    await this.auditService.log({
      companyId,
      actorId: userId,
      action: AuditAction.ACCOUNT_CREATED,
      entityType: 'Company',
      entityId: companyId,
      after: { note: 'Initial Chart of Accounts Seeded' },
    });
  }

  /**
   * Seeds standard tax rates for a company.
   */
  async seedTaxRates(companyId: string) {
    const rates = [
      { name: 'TPS (5%)', code: 'GST', rate: 0.05 },
      { name: 'TVQ (9.975%)', code: 'QST', rate: 0.09975 },
      { name: 'TPS/TVQ (14.975%)', code: 'GST_QST', rate: 0.14975 },
    ];

    for (const r of rates) {
      const taxRate = await this.prisma.client.taxRate.create({
        data: {
          companyId,
          name: r.name,
          code: r.code,
        },
      });

      await this.prisma.client.taxRatePeriod.create({
        data: {
          taxRateId: taxRate.id,
          effectiveFrom: new Date('2000-01-01'),
          rate: r.rate,
        },
      });
    }
  }

  /**
   * Closes a fiscal period.
   */
  async closePeriod(companyId: string, periodId: string) {
    const period = await this.prisma.client.fiscalPeriod.findUnique({
      where: { id: periodId, companyId },
    });

    if (!period) throw new NotFoundException('Period not found');
    if (period.status !== 'OPEN') throw new BadRequestException('Period is not open');

    // In a real app, we would check for unmatched transactions here.
    return this.prisma.client.fiscalPeriod.update({
      where: { id: periodId },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Opens a new fiscal period.
   */
  async openPeriod(companyId: string, startDate: Date, endDate: Date) {
    return this.prisma.client.fiscalPeriod.create({
      data: {
        companyId,
        startDate,
        endDate,
        status: 'OPEN',
      },
    });
  }
}
