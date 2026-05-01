import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { InvoiceService } from './invoice.service';
import { BillService } from './bill.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('invoicing')
@UseGuards(AuthGuard, RolesGuard)
export class InvoicingController {
  constructor(
    private readonly contactService: ContactService,
    private readonly invoiceService: InvoiceService,
    private readonly billService: BillService,
  ) {}

  // --- Contacts ---

  @Get('contacts')
  async getContacts(@ActiveTenant() tenant: TenantContext) {
    return this.contactService.getContacts(tenant.companyId);
  }

  @Post('contacts')
  @Roles('owner', 'admin')
  async createContact(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactService.createContact(tenant.companyId, dto);
  }

  @Patch('contacts/:id')
  @Roles('owner', 'admin')
  async updateContact(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactService.updateContact(tenant.companyId, id, dto);
  }

  @Delete('contacts/:id')
  @Roles('owner', 'admin')
  async deleteContact(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.contactService.deleteContact(tenant.companyId, id);
  }

  // --- Invoices ---

  @Post('invoices')
  @Roles('owner', 'admin')
  async createInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.createInvoice(tenant.companyId, dto);
  }

  @Get('invoices')
  async getInvoices(@ActiveTenant() tenant: TenantContext) {
    return this.invoiceService.getInvoices(tenant.companyId);
  }

  @Patch('invoices/:id')
  @Roles('owner', 'admin')
  async updateInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.updateInvoice(tenant.companyId, tenant.userId, id, dto);
  }

  @Delete('invoices/:id')
  @Roles('owner', 'admin')
  async deleteInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.invoiceService.deleteInvoice(tenant.companyId, tenant.userId, id);
  }

  @Patch('invoices/:id/post')
  @Roles('owner', 'admin')
  async postInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.invoiceService.postInvoice(tenant.companyId, tenant.userId, id);
  }

  @Post('invoices/:id/send')
  async sendInvoice(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.invoiceService.sendInvoiceEmail(tenant.companyId, id);
  }

  // --- Bills ---

  @Post('bills')
  @Roles('owner', 'admin')
  async createBill(
    @ActiveTenant() tenant: TenantContext,
    @Body() dto: any, // Reuse a generic DTO or create CreateBillDto
  ) {
    return this.billService.createBill(tenant.companyId, dto);
  }

  @Get('bills')
  async getBills(@ActiveTenant() tenant: TenantContext) {
    return this.billService.getBills(tenant.companyId);
  }

  @Patch('bills/:id')
  @Roles('owner', 'admin')
  async updateBill(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.billService.updateBill(tenant.companyId, tenant.userId, id, dto);
  }

  @Delete('bills/:id')
  @Roles('owner', 'admin')
  async deleteBill(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.billService.deleteBill(tenant.companyId, tenant.userId, id);
  }

  @Patch('bills/:id/approve')
  @Roles('owner', 'admin')
  async approveBill(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.billService.approveBill(tenant.companyId, tenant.userId, id);
  }

  @Post('bills/:id/pay')
  async payBill(
    @ActiveTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body('accountId') accountId: string,
  ) {
    return this.billService.payBill(tenant.companyId, tenant.userId, id, accountId);
  }
}
