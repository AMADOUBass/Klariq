import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets or creates the user profile for a given external user ID.
   */
  async getProfile(externalId: string, companyId: string) {
    let profile = await this.prisma.client.userProfile.findUnique({
      where: { externalId },
      include: { company: true },
    });

    if (!profile) {
      // Find the company by external ID (ba_organization.id)
      const company = await this.prisma.client.company.findUnique({
        where: { externalId: companyId },
      });

      if (!company) {
        throw new NotFoundException(`Company with external ID ${companyId} not found`);
      }

      profile = await this.prisma.client.userProfile.create({
        data: {
          externalId,
          companyId: company.id,
          role: 'MEMBER', // Default role
          locale: 'fr-CA',
        },
        include: { company: true },
      });
    }

    return profile;
  }

  /**
   * Updates the user profile.
   */
  async updateProfile(externalId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.client.userProfile.findUnique({
      where: { externalId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    return this.prisma.client.userProfile.update({
      where: { externalId },
      data: {
        locale: dto.locale,
        // display name and avatar are handled by Better-Auth's ba_user table,
        // but we can store local overrides or sync them if needed.
        // For now, we only store the app-specific fields in UserProfile.
      },
    });
  }
}
