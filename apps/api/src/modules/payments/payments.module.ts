import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { WebhookController } from './webhook.controller';
import { CheckoutController } from './checkout.controller';

@Module({
  controllers: [WebhookController, CheckoutController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
