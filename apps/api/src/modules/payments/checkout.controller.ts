import { 
  Controller, 
  Post, 
  Param, 
  NotFoundException, 
  BadRequestException 
, UseGuards } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentStatus } from '@klariq/db';

@ApiTags('Payments')
@Controller('payments/checkout')
@UseGuards(AuthGuard)
export class CheckoutController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('invoice/:id')
  @ApiOperation({ summary: 'Create a payment intent for an invoice' })
  async createInvoicePayment(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { id, companyId: tenant.companyId },
      include: { contact: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === DocumentStatus.PAID) throw new BadRequestException('Invoice already paid');
    if (invoice.status === DocumentStatus.DRAFT) throw new BadRequestException('Cannot pay a draft invoice');

    const intent = await this.stripeService.createPaymentIntent({
      amount: invoice.totalAmount.toNumber(),
      currency: invoice.currency,
      invoiceId: invoice.id,
      companyId: tenant.companyId,
      customerId: invoice.contact.externalId || undefined, // Optional: if we store Stripe Customer IDs
    });

    return {
      clientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY, // We should probably add this to env.ts too
    };
  }
}
