import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { twoFactorClient } from 'better-auth/client/plugins';

/**
 * Better-Auth client for browser-side usage.
 * Mirrors the server-side auth config: organization + 2FA plugins.
 *
 * Usage in components:
 *   import { authClient } from '@/lib/auth-client';
 *   const { data: session } = authClient.useSession();
 *   await authClient.signIn.email({ email, password });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: any = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  plugins: [organizationClient(), twoFactorClient()],
});

export type ClientSession = typeof authClient.$Infer.Session;
export type ClientUser = typeof authClient.$Infer.Session.user;
