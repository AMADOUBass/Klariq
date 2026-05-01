import { Module, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getRedisConnection } from './redis.connection';
import { WelcomeEmailProcessor } from './processors/welcome-email.processor';
import { InvoiceEmailProcessor } from './processors/invoice-email.processor';

export const WELCOME_EMAIL_QUEUE = 'klariq-welcome-email';
export const INVOICE_EMAIL_QUEUE = 'klariq-invoice-email';

/**
 * QueuesModule wires up BullMQ queues and processors.
 *
 * Adding a new queue in Phase 2/3:
 *   1. Define a QUEUE_NAME constant here
 *   2. Create a processor in ./processors/<name>.processor.ts
 *   3. Export the Queue via provider token 'QUEUE:<NAME>'
 *   4. Inject in the domain module that needs to enqueue jobs
 *
 * Idempotency contract: every job payload MUST include an `idempotencyKey`.
 * See WelcomeEmailProcessor for the idempotency pattern.
 */
@Module({
  providers: [
    {
      provide: `QUEUE:${WELCOME_EMAIL_QUEUE}`,
      useFactory: () =>
        new Queue(WELCOME_EMAIL_QUEUE, {
          connection: getRedisConnection(),
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2_000 },
            removeOnComplete: { count: 1_000 },
            removeOnFail: { count: 5_000 },
          },
        }),
    },
    {
      provide: `QUEUE:${INVOICE_EMAIL_QUEUE}`,
      useFactory: () =>
        new Queue(INVOICE_EMAIL_QUEUE, {
          connection: getRedisConnection(),
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2_000 },
            removeOnComplete: { count: 1_000 },
            removeOnFail: { count: 5_000 },
          },
        }),
    },
    WelcomeEmailProcessor,
    InvoiceEmailProcessor,
  ],
  exports: [
    `QUEUE:${WELCOME_EMAIL_QUEUE}`,
    `QUEUE:${INVOICE_EMAIL_QUEUE}`,
  ],
})
export class QueuesModule implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    const connection = getRedisConnection();
    await connection.quit();
  }
}
