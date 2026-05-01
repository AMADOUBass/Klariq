import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async createContact(companyId: string, dto: CreateContactDto) {
    return this.prisma.client.contact.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  async getContacts(companyId: string) {
    return this.prisma.client.contact.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async getContact(companyId: string, id: string) {
    const contact = await this.prisma.client.contact.findUnique({
      where: { id, companyId },
    });

    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async updateContact(companyId: string, id: string, dto: CreateContactDto) {
    const contact = await this.getContact(companyId, id);
    return this.prisma.client.contact.update({
      where: { id: contact.id },
      data: dto,
    });
  }

  async deleteContact(companyId: string, id: string) {
    const contact = await this.getContact(companyId, id);
    return this.prisma.client.contact.delete({
      where: { id: contact.id },
    });
  }
}
