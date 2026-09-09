'use server';

import { getServerSession } from '@/lib/get-session';
import prisma from '@/lib/prisma';
import { ActionResponse } from '@/types/action-type';

export async function saveEncryptedVaultKey(
  encryptedVaultKey: string,
  encryptedVaultKeyIv: string,
): Promise<ActionResponse> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        encryptedVaultKey,
        encryptedVaultKeyIv,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save encrypted vault key' };
  }
}
