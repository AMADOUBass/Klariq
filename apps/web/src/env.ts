import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Validated environment variables for the web app.
 * Server vars are only accessible in Server Components and API routes.
 * Client vars (NEXT_PUBLIC_*) are bundled into the client JS.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_API_URL: z
      .string()
      .url('NEXT_PUBLIC_API_URL must be a valid URL')
      .default('http://localhost:4000'),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  onValidationError: (error) => {
    console.error('❌  Invalid environment variables:\n', error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  },
});
