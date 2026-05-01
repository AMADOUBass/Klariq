import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { OnboardCompanyDto } from '../identity/dto/onboard-company.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';
import { auth } from '../../auth/auth.config';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Onboards a new company (tenant).
   * This should be called after a Better-Auth organization is created.
   */
  async onboardCompany(externalId: string, dto: OnboardCompanyDto) {
    const existing = await this.prisma.client.company.findUnique({
      where: { externalId },
    });

    if (existing) {
      throw new ConflictException('Company already onboarded');
    }

    return this.prisma.client.company.create({
      data: {
        id: externalId,
        externalId,
        name: dto.name,
        legalName: dto.legalName,
        taxNumberGst: dto.taxNumberGst,
        taxNumberQst: dto.taxNumberQst,
        fiscalYearStart: new DateTime(dto.fiscalYearStart),
        baseCurrency: dto.baseCurrency,
      },
    });
  }

  /**
   * Gets company settings.
   */
  async getCompany(externalId: string) {
    const company = await this.prisma.client.company.findUnique({
      where: { externalId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  /**
   * Invites a member to the company.
   * Delegates to Better-Auth API.
   */
  async inviteMember(externalCompanyId: string, dto: InviteMemberDto) {
    // Better-Auth handles the invitation flow and email sending.
    // We just wrap the API call for convenience.
    // Note: In a real app, you might want to log this in AuditLog.
    
    // We need a request context or a valid session to use the API if it's protected,
    // or we can use the internal auth.api.inviteMember.
    return (auth.api as any).createInvitation({
      body: {
        email: dto.email,
        role: dto.role,
        organizationId: externalCompanyId,
      }
    });
  }
}

// Helper to avoid build error with DateTime
class DateTime extends Date {}
