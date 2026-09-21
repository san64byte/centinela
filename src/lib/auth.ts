import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from '@/lib/prisma';
import { username } from 'better-auth/plugins';
import { generateSalt } from './crypto/encoding';
import { sendEmail } from './email';
import { nextCookies } from 'better-auth/next-js';
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { cookies } from 'next/headers';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari masa aktif sesi
    updateAge: 60 * 60 * 24, // Rotasi sesi setiap 24 jam
  },

  rateLimit: {
    enabled: true,
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 900, // 15 menit
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your password',
          text: `Click the link to reset your password: ${url}`,
        });
      } catch (err) {
        console.error('Failed to send reset password email:', err);
      }
    },
    onExistingUserSignUp: async ({ user }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Sign-up attempt with your email',
          text: 'Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.',
        });
      } catch (err) {
        console.error('Failed to send existing user sign-up notice email:', err);
      }
    },
  },

  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: false,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Confirm request to change your Centinela email (Step 1 of 2)',
            text: `A request was made to change your Centinela account email address from ${user.email} to ${newEmail}.\n\nStep 1 of 2: Click this link to approve this request:\n${url}\n\nImportant: Your email address will NOT change immediately after clicking this link. Once you approve this request, a final verification email will be sent to ${newEmail} to complete the change.\n\nIf you did not make this request, someone may be attempting to access your account. Please change your account password immediately.`,
          });
        } catch (err) {
          console.error('Failed to send change-email confirmation email:', err);
        }
      },
    },
    deleteUser: {
      enabled: true,

      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: 'Confirm deletion of your Centinela account',
          text: `You requested to permanently delete your Centinela account and all its vault contents. Click this link to confirm: ${url}\n\nIf this wasn't you, please ignore this email and change your account password immediately.`,
        });
      },

      beforeDelete: async (user) => {
        await prisma.vaultItem.deleteMany({ where: { userId: user.id } });
      },

      afterDelete: async () => {
        const cookieStore = await cookies();
        cookieStore.set('goodbye_token', crypto.randomUUID(), {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 30,
          path: '/goodbye',
        });
      },
    },
    additionalFields: {
      vaultSalt: { type: 'string', required: false, input: false },
      vaultVerifier: { type: 'string', required: false, input: false },
      encryptedVaultKey: { type: 'string', required: false, input: false },
      encryptedVaultKeyIv: { type: 'string', required: false, input: false },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    async sendVerificationEmail(data, request) {
      const { user, url } = data;
      const token = (data as { token?: string }).token;

      let isChangeEmail = false;

      // 1. Cek dari request context Better Auth jika tersedia
      if (request?.url?.includes('/change-email')) {
        isChangeEmail = true;
      }

      // 2. Cek dari payload token JWT verifikasi
      if (!isChangeEmail && token && typeof token === 'string') {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            if (payload.requestType === 'change-email-verification' || Boolean(payload.updateTo)) {
              isChangeEmail = true;
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      // 3. Cek dari callbackURL pada URL verifikasi
      if (!isChangeEmail && (url.includes('email-change') || url.includes('email-changed'))) {
        isChangeEmail = true;
      }

      // If change-email, redirect to /email-changed after verification
      const finalUrl =
        isChangeEmail && url.includes('callbackURL=')
          ? url.replace(/callbackURL=[^&]+/, `callbackURL=${encodeURIComponent('/email-changed')}`)
          : url;

      const content = isChangeEmail
        ? {
            subject: 'Verify your new Centinela email address (Step 2 of 2)',
            text: `You approved changing your Centinela account email to this address (${user.email}).\n\nStep 2 of 2: Click the link below to verify this new email and activate it on your account:\n${finalUrl}\n\nOnce verified, your account email will be updated, and other active sessions will be signed out for your security.`,
          }
        : {
            subject: 'Verify your email',
            text: `Welcome to Centinela! Click the link to verify your email and get started: ${finalUrl}`,
          };

      try {
        await sendEmail({ to: user.email, ...content });
      } catch (err) {
        console.error(
          `Failed to send ${isChangeEmail ? 'change-email verification' : 'signup verification'} email:`,
          err,
        );
      }
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/change-email') {
        const session = await getSessionFromCtx(ctx);
        const userId = session?.user?.id;
        const oldEmail = session?.user?.email;

        if (userId && oldEmail) {
          try {
            await prisma.verification.upsert({
              where: { id: `email-change-old:${userId}` },
              create: {
                id: `email-change-old:${userId}`,
                identifier: `email-change-old:${userId}`,
                value: oldEmail,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Berlaku 24 jam
              },
              update: {
                value: oldEmail,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
          } catch (err) {
            console.error('Failed to save pending old email:', err);
          }
        }
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              vaultSalt: generateSalt(),
            },
          };
        },
      },
      update: {
        async after(user) {
          const record = await prisma.verification
            .findUnique({
              where: { id: `email-change-old:${user.id}` },
            })
            .catch(() => null);

          const oldEmail = record?.value;

          if (oldEmail && oldEmail !== user.email) {
            await prisma.verification
              .delete({
                where: { id: `email-change-old:${user.id}` },
              })
              .catch(() => null);

            sendEmail({
              to: oldEmail,
              subject: 'Your account email was changed',
              text: `Your account email was changed to ${user.email}. If this wasn't you, please secure your account immediately.`,
            }).catch((err) => console.error('Failed to send email-change notice:', err));

            try {
              await prisma.session.deleteMany({
                where: { userId: user.id },
              });
            } catch (err) {
              console.error('Failed to revoke sessions:', err);
            }
          }
        },
      },
    },
  },

  plugins: [
    username({
      minUsernameLength: 1,
      maxUsernameLength: 12,
      usernameValidator: (username) => /^[a-z0-9_]+$/.test(username),
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type SessionRecord = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
