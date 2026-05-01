import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import pino from 'pino';
import { getRedisConnection } from '../redis.connection';
import { INVOICE_EMAIL_QUEUE } from '../queues.module';
import { MailService } from '../../modules/mail/mail.service';

const logger = pino({ name: 'processor:invoice-email' });

export interface InvoiceEmailPayload {
  idempotencyKey: string;
  invoiceId: string;
  email: string;
  invoiceNumber: string;
  totalAmount: number;
  locale: 'fr' | 'en';
  pdfBuffer?: Buffer; // Optional if we want to attach directly
}

@Injectable()
export class InvoiceEmailProcessor implements OnModuleDestroy {
  private readonly worker: Worker<InvoiceEmailPayload>;

  constructor(private readonly mailService: MailService) {
    this.worker = new Worker<InvoiceEmailPayload>(
      INVOICE_EMAIL_QUEUE,
      async (job: Job<InvoiceEmailPayload>) => {
        const { email, locale, invoiceNumber, totalAmount, pdfBuffer } = job.data;
        
        logger.info(
          { jobId: job.id, invoiceNumber, email },
          'Processing invoice-email job',
        );

        const fmt = (n: number) => new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(n);

        const subject = locale === 'fr' 
          ? `Facture ${invoiceNumber} de Klariq` 
          : `Invoice ${invoiceNumber} from Klariq`;
        
        const html = locale === 'fr'
          ? `<h1>Nouvelle facture</h1><p>Bonjour,</p><p>Votre facture <strong>${invoiceNumber}</strong> d'un montant de <strong>${fmt(totalAmount)}</strong> est disponible.</p>`
          : `<h1>New Invoice</h1><p>Hello,</p><p>Your invoice <strong>${invoiceNumber}</strong> for <strong>${fmt(totalAmount)}</strong> is now available.</p>`;

        await this.mailService.sendMail({
          to: email,
          subject,
          html,
          attachments: pdfBuffer ? [
            {
              filename: `Invoice-${invoiceNumber}.pdf`,
              content: Buffer.from(pdfBuffer),
            }
          ] : undefined,
        });
      },
      {
        connection: getRedisConnection(),
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error: Error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Invoice email job failed');
    });

    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Invoice email job completed');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
