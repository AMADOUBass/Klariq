import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import pino from 'pino';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../context/tenant.context';
import { PrismaService } from '../database/prisma.service';

const logger = pino({ name: 'audit' });

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    const { method, url, ip, headers } = req;
    const start = Date.now();
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap({
        next: async (response) => {
          if (isMutation && req.tenantContext) {
            const { companyId, userId } = req.tenantContext;
            
            // Background task: persist to DB
            this.prisma.client.auditLog.create({
              data: {
                companyId,
                actorId: userId,
                action: `${method} ${url}`,
                entityType: this.getEntityType(url),
                entityId: (response as any)?.id ?? 'n/a',
                before: req.body as any,
                after: response as any,
                ipAddress: ip,
                userAgent: headers['user-agent'],
              },
            }).catch((err: unknown) => logger.error({ msg: 'Audit log persistence failed', err }));

            logger.info({
              actor: userId,
              companyId,
              action: `${method} ${url}`,
              durationMs: Date.now() - start,
            });
          }
        },
        error: (error: unknown) => {
          logger.error({
            actor: req.tenantContext?.userId ?? 'anonymous',
            action: `${method} ${url}`,
            durationMs: Date.now() - start,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
  }

  private getEntityType(url: string): string {
    if (url.includes('/accounting/accounts')) return 'Account';
    if (url.includes('/accounting/journal')) return 'JournalEntry';
    if (url.includes('/invoicing/invoices')) return 'Invoice';
    if (url.includes('/invoicing/bills')) return 'Bill';
    if (url.includes('/invoicing/contacts')) return 'Contact';
    return 'Other';
  }
}
