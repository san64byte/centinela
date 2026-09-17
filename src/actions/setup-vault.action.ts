'use server';

import { getServerSession } from '@/lib/get-session';
import prisma from '@/lib/prisma';
import { ActionResponse } from '@/types/action-type';
import * as z from 'zod';

const setupVaultSchema = z.object({
  encryptedVaultKey: z.string().trim().min(1, 'Encrypted vault key is required').max(1024),
  encryptedVaultKeyIv: z.string().trim().min(1, 'IV is required').max(128),
});

export async function saveEncryptedVaultKey(
  encryptedVaultKey: string,
  encryptedVaultKeyIv: string,
): Promise<ActionResponse> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!session.user.emailVerified) {
      return { success: false, error: 'Email verification required' };
    }

    const parsed = setupVaultSchema.safeParse({ encryptedVaultKey, encryptedVaultKeyIv });
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault key payload' };
    }

    const result = await prisma.user.updateMany({
      where: {
        id: session.user.id,
        encryptedVaultKey: null,
      },
      data: {
        encryptedVaultKey: parsed.data.encryptedVaultKey,
        encryptedVaultKeyIv: parsed.data.encryptedVaultKeyIv,
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'Vault key already initialized or user not found' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save encrypted vault key' };
  }
}
