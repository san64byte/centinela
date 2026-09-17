'use server';

import { getServerSession } from '@/lib/get-session';
import prisma from '@/lib/prisma';
import { ActionResponse } from '@/types/action-type';
import { revalidatePath } from 'next/cache';
import { verifyPassword } from 'better-auth/crypto';
import * as z from 'zod';

const updateMasterPasswordSchema = z.object({
  encryptedVaultKey: z.string().trim().min(1, 'Encrypted vault key is required').max(1024),
  encryptedVaultKeyIv: z.string().trim().min(1, 'IV is required').max(128),
});

export const updateMasterPassword = async (
  encryptedVaultKey: string,
  encryptedVaultKeyIv: string,
): Promise<ActionResponse> => {
  try {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    if (!session.user.emailVerified) {
      return { success: false, error: 'Email verification required' };
    }

    const parsed = updateMasterPasswordSchema.safeParse({
      encryptedVaultKey,
      encryptedVaultKeyIv,
    });
    if (!parsed.success) {
      return { success: false, error: 'Invalid master password key payload' };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          encryptedVaultKey: parsed.data.encryptedVaultKey,
          encryptedVaultKeyIv: parsed.data.encryptedVaultKeyIv,
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId: session.user.id,
          id: { not: session.session.id },
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

export const resetMasterPassword = async (accountPassword: string): Promise<ActionResponse> => {
  const session = await getServerSession();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  if (!accountPassword || typeof accountPassword !== 'string') {
    return { success: false, error: 'Account password is required to reset master password' };
  }

  const userId = session.user.id;

  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        providerId: 'credential',
      },
    });

    if (!account?.password) {
      return { success: false, error: 'Account credential record not found' };
    }

    const isPasswordValid = await verifyPassword({
      hash: account.password,
      password: accountPassword,
    });

    if (!isPasswordValid) {
      return { success: false, error: 'Incorrect account password' };
    }

    await prisma.$transaction([
      prisma.vaultItem.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          encryptedVaultKey: null,
          encryptedVaultKeyIv: null,
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId,
          id: { not: session.session.id },
        },
      }),
    ]);

    revalidatePath('/vault');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Reset master password error:', error);

    return {
      success: false,
      error: 'Something went wrong while resetting the master password',
    };
  }
};
