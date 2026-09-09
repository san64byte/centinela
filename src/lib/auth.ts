import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from '@/lib/prisma';
import { username } from 'better-auth/plugins';
import { generateSalt } from './crypto/encoding';
import { nextCookies } from 'better-auth/next-js';
import { sendEmail } from './email';
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { cookies } from 'next/headers';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

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
        console.error('Failed to send reset password email:', err);
      }
    },
  },

  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: false,
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
      encryptedVaultKey: { type: 'string', required: false, input: false },
      encryptedVaultKeyIv: { type: 'string', required: false, input: false },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    async sendVerificationEmail({ user, url }, request) {
      const isChangeEmail = request?.url?.includes('/change-email');

      const content = isChangeEmail
        ? {
            subject: 'Confirm your new email',
            text: `Click the link to confirm this email: ${url}`,
          }
        : {
            subject: 'Verify your email',
            text: `Welcome! Click the link to verify your email and get started: ${url}`,
          };

      try {
        await sendEmail({ to: user.email, ...content });
      } catch (err) {
        console.error(
          `Failed to send ${isChangeEmail ? 'change-email confirmation' : 'signup verification'} email:`,
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
export type User = typeof auth.$Infer.Session.user;
