import { Injectable, type OnModuleInit } from '@nestjs/common';
import { prisma } from '@klariq/db';

/**
 * PrismaService wraps the @klariq/db singleton for NestJS.
 * 
 * We use the singleton exported from the db package to ensure
 * connection limits are respected across the monorepo.
 */
@Injectable()
export class PrismaService implements OnModuleInit {
  readonly client = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }
}
