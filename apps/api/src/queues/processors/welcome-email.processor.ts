import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import pino from 'pino';
import { getRedisConnection } from '../redis.connection';
import { WELCOME_EMAIL_QUEUE } from '../queues.module';
import { MailService } from '../../modules/mail/mail.service';

const logger = pino({ name: 'processor:welcome-email' });

export interface WelcomeEmailPayload {
  idempotencyKey: string;
  userId: string;
  email: string;
  companyId: string;
  locale: 'fr' | 'en';
}

@Injectable()
export class WelcomeEmailProcessor implements OnModuleDestroy {
  private readonly worker: Worker<WelcomeEmailPayload>;

  constructor(private readonly mailService: MailService) {
    this.worker = new Worker<WelcomeEmailPayload>(
      WELCOME_EMAIL_QUEUE,
      async (job: Job<WelcomeEmailPayload>) => {
        const { email, locale, idempotencyKey } = job.data;
        
        logger.info(
          { jobId: job.id, idempotencyKey, email },
          'Processing welcome-email job',
        );

        const subject = locale === 'fr' 
          ? 'Bienvenue chez Klariq !' 
          : 'Welcome to Klariq!';
        
        const html = locale === 'fr'
          ? `<h1>Bienvenue !</h1><p>Nous sommes ravis de vous compter parmi nous. Klariq est prêt à propulser votre comptabilité.</p>`
          : `<h1>Welcome!</h1><p>We're thrilled to have you. Klariq is ready to power your accounting.</p>`;

        await this.mailService.sendMail({
          to: email,
          subject,
          html,
        });
      },
      {
        connection: getRedisConnection(),
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error: Error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Welcome email job failed');
    });

    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Welcome email job completed');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
