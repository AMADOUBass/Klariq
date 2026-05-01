import { 
  Controller, 
  Post, 
  Headers, 
  Req, 
  BadRequestException, 
  RawBodyRequest 
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../common/database/prisma.service';
import { DocumentStatus } from '@klariq/db';
import pino from 'pino';

const logger = pino({ name: 'webhook:stripe' });

@Controller('payments')
export class WebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') sig: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!sig) throw new BadRequestException('Missing stripe-signature');

    let event;
    try {
      // Use rawBody for signature verification
      event = this.stripeService.constructEvent(req.rawBody!, sig);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Webhook signature verification failed');
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // 1. Idempotency Check
    const existing = await this.prisma.client.processedWebhook.findUnique({
      where: { 
        provider_externalId: {
          provider: 'stripe',
          externalId: event.id
        }
      },
    });

    if (existing) {
      return { received: true, status: 'already_processed' };
    }

    // 2. Handle Event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        default:
          logger.debug({ type: event.type }, 'Unhandled stripe event type');
      }

      // 3. Mark as processed
      await this.prisma.client.processedWebhook.create({
        data: {
          externalId: event.id,
          provider: 'stripe',
        },
      });

      return { received: true };
    } catch (err: any) {
      logger.error({ err: err.message, eventId: event.id }, 'Error processing webhook event');
      throw new BadRequestException('Error processing event');
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    const { invoiceId, companyId } = paymentIntent.metadata;

    if (!invoiceId || !companyId) {
      logger.warn({ paymentIntentId: paymentIntent.id }, 'Payment succeeded without invoice metadata');
      return;
    }

    logger.info({ invoiceId, amount: paymentIntent.amount }, 'Reconciling successful payment');

    // Update invoice status to PAID
    await this.prisma.client.invoice.update({
      where: { id: invoiceId, companyId },
      data: {
        status: DocumentStatus.PAID,
      },
    });

    // In a real app, we would also create a Payment record and a Journal Entry for the cash receipt.
    // For now, updating the status is the priority.
  }
}
