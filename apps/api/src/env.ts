import { createEnv } from '@t3-oss/env-core';
import type { ZodError } from 'zod';
import { z } from 'zod';

/**
 * Validated environment variables for the API.
 * The app exits at boot if any required var is missing or malformed.
 * Add new vars here — never access process.env directly.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
    DATABASE_DIRECT_URL: z
      .string()
      .url('DATABASE_DIRECT_URL must be a valid PostgreSQL connection string'),
    REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    WEB_URL: z.string().url().default('http://localhost:3000'),
    RESEND_API_KEY: z.string().min(1).default('re_placeholder'),
    STRIPE_SECRET_KEY: z.string().min(1).default('sk_test_placeholder'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).default('whsec_placeholder'),
  },
  runtimeEnv: {
    NODE_ENV: process.env['NODE_ENV'],
    PORT: process.env['PORT'] ?? process.env['API_PORT'],
    DATABASE_URL: process.env['DATABASE_URL'],
    DATABASE_DIRECT_URL: process.env['DATABASE_DIRECT_URL'],
    REDIS_URL: process.env['REDIS_URL'],
    BETTER_AUTH_SECRET: process.env['BETTER_AUTH_SECRET'],
    WEB_URL: process.env['WEB_URL'],
    RESEND_API_KEY: process.env['RESEND_API_KEY'],
    STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'],
    STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'],
  },
  onValidationError: (error: ZodError) => {
    console.error('❌  Invalid environment variables:\n', error.flatten().fieldErrors);
    process.exit(1);
  },
});
