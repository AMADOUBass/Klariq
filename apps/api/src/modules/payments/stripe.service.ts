import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { env } from '../../env';

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(StripeService.name);

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  onModuleInit() {
    if (env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      this.logger.warn('Stripe is using placeholder key. Payments will fail.');
    }
  }

  /**
   * Creates a Payment Intent for an invoice.
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    invoiceId: string;
    companyId: string;
    customerId?: string;
  }) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Stripe expects cents
      currency: params.currency.toLowerCase(),
      metadata: {
        invoiceId: params.invoiceId,
        companyId: params.companyId,
      },
      customer: params.customerId,
      automatic_payment_methods: { enabled: true },
    });
  }

  /**
   * Verifies and constructs a Stripe event from the webhook payload.
   */
  constructEvent(payload: string | Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  }
}
