'use server';

import prisma from '@/lib/prisma';
import { requireAuthUser, verifyUserAccountPassword } from '@/lib/server-auth';
import { hashPassword } from 'better-auth/crypto';
import { ActionResponse } from '@/types/action-type';
import * as z from 'zod';

const setupVaultSchema = z.object({
  encryptedVaultKey: z.string().trim().min(1, 'Encrypted vault key is required').max(1024),
  encryptedVaultKeyIv: z.string().trim().min(1, 'IV is required').max(128),
  vaultVerifier: z.string().trim().min(1).max(512),
  accountPassword: z.string().min(1, 'Account password is required'),
});

export async function saveEncryptedVaultKey(
  encryptedVaultKey: string,
  encryptedVaultKeyIv: string,
  accountPassword: string,
  vaultVerifier: string,
): Promise<ActionResponse> {
  try {
    const auth = await requireAuthUser();
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const parsed = setupVaultSchema.safeParse({
      encryptedVaultKey,
      encryptedVaultKeyIv,
      accountPassword,
      vaultVerifier,
    });
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault key payload' };
    }

    const passwordCheck = await verifyUserAccountPassword(
      auth.user.id,
      parsed.data.accountPassword,
    );
    if (!passwordCheck.success) {
      return passwordCheck;
    }

    const hashedVerifier = await hashPassword(parsed.data.vaultVerifier);

    const result = await prisma.user.updateMany({
      where: {
        id: auth.user.id,
        encryptedVaultKey: null,
      },
      data: {
        encryptedVaultKey: parsed.data.encryptedVaultKey,
        encryptedVaultKeyIv: parsed.data.encryptedVaultKeyIv,
        vaultVerifier: hashedVerifier,
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
