import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../../env';
import pino from 'pino';

const logger = pino({ name: 'service:mail' });

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

@Injectable()
export class MailService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async sendMail(options: SendMailOptions) {
    try {
      logger.debug({ to: options.to, subject: options.subject }, 'Sending email via Resend');
      
      const { data, error } = await this.resend.emails.send({
        from: 'Klariq <onboarding@resend.dev>', // Should be a verified domain in prod
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
        })),
      });

      if (error) {
        logger.error({ error }, 'Failed to send email via Resend');
        throw new Error(error.message);
      }

      logger.info({ emailId: data?.id }, 'Email sent successfully');
      return data;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Unexpected error while sending email');
      throw err;
    }
  }
}
