import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { PrismaClient } from '@klariq/db';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export class TestDb {
  private container?: StartedPostgreSqlContainer;
  private prisma?: PrismaClient;
  private pool?: Pool;

  async setup() {
    // Start Postgres container
    this.container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('klariq_test')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    const databaseUrl = `postgresql://${this.container.getUsername()}:${this.container.getPassword()}@${this.container.getHost()}:${this.container.getMappedPort(5432)}/${this.container.getDatabase()}?schema=public`;

    // Run migrations
    console.log('Running migrations on test database...');
    execSync('npm -w @klariq/db run db:push', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DATABASE_DIRECT_URL: databaseUrl,
      },
    });

    // Initialize Prisma Client with the test container's URL
    this.pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });

    return this.prisma;
  }

  async teardown() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    if (this.pool) {
      await this.pool.end();
    }
    if (this.container) {
      await this.container.stop();
    }
  }

  getPrisma() {
    if (!this.prisma) {
      throw new Error('Test DB not initialized. Call setup() first.');
    }
    return this.prisma;
  }
}
