import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { QueuesModule } from './queues/queues.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { AuditModule } from './modules/audit/audit.module';
import { DatabaseModule } from './common/database/database.module';
import { MailModule } from './modules/mail/mail.module';
import { BankModule } from './modules/bank/bank.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TaxModule } from './modules/tax/tax.module';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    BankModule,
    CurrencyModule,
    PaymentsModule,
    TaxModule,
    HealthModule,
    AuthModule,
    QueuesModule,
    IdentityModule,
    TenancyModule,
    AccountingModule,
    LedgerModule,
    InvoicingModule,
    ReportingModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
