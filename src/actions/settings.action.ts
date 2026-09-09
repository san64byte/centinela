'use server';

import { getServerSession } from '@/lib/get-session';
import prisma from '@/lib/prisma';
import { ActionResponse } from '@/types/action-type';
import { revalidatePath } from 'next/cache';

export const updateMasterPassword = async (
  encryptedVaultKey: string,
  encryptedVaultKeyIv: string,
): Promise<ActionResponse> => {
  try {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          encryptedVaultKey,
          encryptedVaultKeyIv,
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

export const resetMasterPassword = async (): Promise<ActionResponse> => {
  const session = await getServerSession();
  if (!session?.user) return { success: false, error: 'User not found' };

  const userId = session.user.id;

  try {
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
