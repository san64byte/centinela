'use server';

import prisma from '@/lib/prisma';
import {
  requireAuthUser,
  verifyMasterPasswordProof,
  verifyUserAccountPassword,
} from '@/lib/server-auth';
import { hashPassword } from 'better-auth/crypto';
import { sendEmail } from '@/lib/email';
import { ActionResponse } from '@/types/action-type';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { generateSalt } from '@/lib/crypto/encoding';
import { checkEmailVerificationCooldown } from '@/lib/rate-limit';

const updateMasterPasswordSchema = z.object({
  encryptedVaultKey: z.string().trim().min(1, 'Encrypted vault key is required').max(1024),
  encryptedVaultKeyIv: z.string().trim().min(1, 'IV is required').max(128),
  newVaultSalt: z.string().trim().min(1, 'New vault salt is required').max(512),
  newVaultVerifier: z.string().trim().min(1, 'New vault verifier is required').max(512),
  accountPassword: z.string().min(1, 'Account password is required'),
  authProof: z.string().trim().min(1, 'Master password verification proof is required').optional(),
});

export const verifyAccountPassword = async (accountPassword: string): Promise<ActionResponse> => {
  try {
    const auth = await requireAuthUser({ requireEmailVerified: false });
    if (!auth.success) return { success: false, error: auth.error };

    return await verifyUserAccountPassword(auth.user.id, accountPassword);
  } catch {
    return { success: false, error: 'Failed to verify account password' };
  }
};

export const updateMasterPassword = async (
  encryptedVaultKey: string,
  encryptedVaultKeyIv: string,
  accountPassword: string,
  options?: {
    newVaultSalt?: string;
    newVaultVerifier?: string;
    authProof?: string;
  },
): Promise<ActionResponse> => {
  try {
    const auth = await requireAuthUser();
    if (!auth.success) return { success: false, error: auth.error };

    const parsed = updateMasterPasswordSchema.safeParse({
      encryptedVaultKey,
      encryptedVaultKeyIv,
      accountPassword,
      newVaultSalt: options?.newVaultSalt,
      newVaultVerifier: options?.newVaultVerifier,
      authProof: options?.authProof,
    });
    if (!parsed.success) {
      return { success: false, error: 'Invalid master password key payload' };
    }

    const passwordCheck = await verifyUserAccountPassword(
      auth.user.id,
      parsed.data.accountPassword,
    );
    if (!passwordCheck.success) {
      return passwordCheck;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { vaultVerifier: true },
    });

    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }

    const storedVerifier = currentUser.vaultVerifier;

    if (storedVerifier) {
      if (!parsed.data.authProof) {
        return { success: false, error: 'Current master password verification is required' };
      }

      const isProofValid = await verifyMasterPasswordProof(parsed.data.authProof, storedVerifier);
      if (!isProofValid) {
        return { success: false, error: 'Current master password verification failed' };
      }
    }

    const hashedNewVerifier = await hashPassword(parsed.data.newVaultVerifier);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: auth.user.id },
        data: {
          encryptedVaultKey: parsed.data.encryptedVaultKey,
          encryptedVaultKeyIv: parsed.data.encryptedVaultKeyIv,
          vaultSalt: parsed.data.newVaultSalt,
          vaultVerifier: hashedNewVerifier,
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId: auth.user.id,
          id: { not: auth.session.id },
        },
      }),
    ]);

    revalidatePath('/settings');
    revalidatePath('/vault');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update master password' };
  }
};

export const requestResetMasterPassword = async (
  accountPassword: string,
): Promise<ActionResponse> => {
  const auth = await requireAuthUser();
  if (!auth.success) return { success: false, error: auth.error };

  const passwordCheck = await verifyUserAccountPassword(
    auth.user.id,
    accountPassword,
    'Account password is required to reset master password',
  );
  if (!passwordCheck.success) {
    return passwordCheck;
  }

  const userId = auth.user.id;
  const userEmail = auth.user.email;

  const cooldown = await checkEmailVerificationCooldown(`reset-vault:${userId}`);
  if (!cooldown.success) {
    return {
      success: false,
      error:
        cooldown.error ||
        'Too many requests. Please wait a moment before requesting another reset email.',
    };
  }

  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    await prisma.verification.deleteMany({
      where: { identifier: `reset-vault:${userId}` },
    });

    await prisma.verification.create({
      data: {
        id: `reset-vault:${token}`,
        identifier: `reset-vault:${userId}`,
        value: token,
        expiresAt,
      },
    });

    const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    const confirmUrl = `${appUrl}/confirm-reset-vault?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: userEmail,
      subject: 'Confirm Reset of Your Centinela Master Password',
      text: `You have requested to reset your Master Password.

WARNING: Resetting your master password will PERMANENTLY ERASE all items stored in your encrypted vault. This action cannot be undone.

To confirm this action, please click the link below (valid for 15 minutes):
${confirmUrl}

If you did not request this, plea
se secure your account and change your login password immediately.`,
    });

    return { success: true };
  } catch (error) {
    console.error('Request reset master password error:', error);
    return {
      success: false,
      error: 'Failed to send confirmation email for resetting master password',
    };
  }
};

const confirmResetTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'Invalid or missing reset token')
    .max(128, 'Invalid or missing reset token')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid or missing reset token'),
});

export const confirmResetMasterPassword = async (token: string): Promise<ActionResponse> => {
  const auth = await requireAuthUser();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = confirmResetTokenSchema.safeParse({ token });
  if (!parsed.success) {
    return { success: false, error: 'Invalid or missing reset token' };
  }

  const validToken = parsed.data.token;

  try {
    const record = await prisma.verification.findUnique({
      where: { id: `reset-vault:${validToken}` },
    });

    if (!record || record.value !== validToken || record.expiresAt < new Date()) {
      return {
        success: false,
        error: 'The reset confirmation link is invalid or has expired. Please request a new one.',
      };
    }

    if (record.identifier !== `reset-vault:${auth.user.id}`) {
      return { success: false, error: 'Unauthorized to confirm this reset request' };
    }

    const userId = auth.user.id;

    await prisma.$transaction([
      prisma.vaultItem.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          encryptedVaultKey: null,
          encryptedVaultKeyIv: null,
          vaultVerifier: null,
          vaultSalt: generateSalt(),
        },
      }),
      prisma.verification.delete({
        where: { id: `reset-vault:${validToken}` },
      }),
      prisma.session.deleteMany({
        where: {
          userId,
          id: { not: auth.session.id },
        },
      }),
    ]);

    revalidatePath('/vault');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Confirm reset master password error:', error);
    return {
      success: false,
      error: 'Failed to confirm master password reset',
    };
  }
};
