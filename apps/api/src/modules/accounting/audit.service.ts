import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

export enum AuditAction {
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_POSTED = 'INVOICE_POSTED',
  INVOICE_VOIDED = 'INVOICE_VOIDED',
  INVOICE_DELETED = 'INVOICE_DELETED',
  BILL_CREATED = 'BILL_CREATED',
  BILL_UPDATED = 'BILL_UPDATED',
  BILL_APPROVED = 'BILL_APPROVED',
  BILL_PAID = 'BILL_PAID',
  BILL_DELETED = 'BILL_DELETED',
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_DELETED = 'CONTACT_DELETED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  JOURNAL_ENTRY_POSTED = 'JOURNAL_ENTRY_POSTED',
  COMPANY_SETTINGS_UPDATED = 'COMPANY_SETTINGS_UPDATED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  DATA_EXPORTED = 'DATA_EXPORTED',
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security or business event in the audit log.
   */
  async log(params: {
    companyId: string;
    actorId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.client.auditLog.create({
      data: {
        companyId: params.companyId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before,
        after: params.after,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  /**
   * Retrieves audit logs for a company with pagination.
   */
  async getLogs(companyId: string, limit = 50, offset = 0) {
    return this.prisma.client.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
  }
}
