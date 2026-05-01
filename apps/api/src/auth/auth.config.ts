import { betterAuth } from 'better-auth';
import { organization, twoFactor } from 'better-auth/plugins';
import { Pool } from 'pg';
import { z } from 'zod';
import { hash, verify } from '@node-rs/argon2';
import { env } from '../env';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Better-Auth configuration for Klariq.
 *
 * Auth model:
 *  - Email + password (hashed with argon2id via @node-rs/argon2)
 *  - Organizations plugin: each org maps to a tenant (Company in Phase 2)
 *  - Two-factor plugin: optional TOTP via authenticator apps
 *
 * Better-Auth manages its own tables (ba_user, ba_session, ba_organization, …).
 * Run `npx better-auth migrate` to create them before first boot.
 */
export const auth: any = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: `http://localhost:${env.PORT}`,
  trustedOrigins: [env.WEB_URL],

  database: new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    max: 5,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: (password) => hash(password),
      verify: async ({ hash: h, password: p }) => {
        try {
          return await verify(h, p);
        } catch (e) {
          console.error('[Verify Error]', e);
          return false;
        }
      },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      sendInvitationEmail: async (data, request) => {
        try {
          // data contains email, role, inviter, organization
          const inviteUrl = `${env.WEB_URL}/accept-invitation?id=${data.id}`;
          
          await resend.emails.send({
            from: 'Klariq <onboarding@resend.dev>',
            to: data.email,
            subject: `Invitation à rejoindre ${data.organization.name}`,
            html: `
              <h2>Bonjour !</h2>
              <p>Vous avez été invité à rejoindre l'organisation <strong>${data.organization.name}</strong> avec le rôle <strong>${data.role}</strong>.</p>
              <br/>
              <p><a href="${inviteUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accepter l'invitation</a></p>
            `,
          });
          console.log(`Invitation email sent to ${data.email}`);
        } catch (error) {
          console.error('Failed to send invitation email', error);
        }
      },
    }),
    twoFactor({
      issuer: 'Klariq',
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
