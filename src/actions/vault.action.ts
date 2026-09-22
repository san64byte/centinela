'use server';

import prisma from '@/lib/prisma';
import { requireAuthUser } from '@/lib/server-auth';
import { ActionResponse } from '@/types/action-type';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';

const encryptedVaultItemSchema = z.object({
  pinned: z.boolean().default(false),
  ciphertext: z
    .string()
    .min(1, 'Ciphertext is required')
    .max(500000, 'Ciphertext exceeds maximum size'),
  iv: z.string().min(1, 'IV is required').max(128, 'IV exceeds maximum size'),
});

const togglePinSchema = z.object({
  id: z.string().trim().min(1, 'Item ID is required').max(128),
  pinned: z.boolean(),
});

const deleteVaultItemSchema = z.object({
  id: z.string().trim().min(1, 'Item ID is required').max(128, 'Item ID exceeds maximum size'),
});

const updateVaultItemParamsSchema = z.object({
  itemId: z.string().trim().min(1, 'Item ID is required').max(128, 'Item ID exceeds maximum size'),
});

export type EncryptedVaultItemInput = z.input<typeof encryptedVaultItemSchema>;

export const createEncryptedVaultItem = async (
  vaultItem: EncryptedVaultItemInput,
): Promise<ActionResponse<{ id: string }>> => {
  try {
    const auth = await requireAuthUser();
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const parsed = encryptedVaultItemSchema.safeParse(vaultItem);
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault item payload' };
    }

    const created = await prisma.vaultItem.create({
      data: {
        pinned: parsed.data.pinned,
        ciphertext: parsed.data.ciphertext,
        iv: parsed.data.iv,
        userId: auth.user.id,
      },
    });

    revalidatePath('/vault');
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error('Create vault item error:', error);
    return { success: false, error: 'Failed to create vault item' };
  }
};

export const updateEncryptedVaultItem = async (
  itemId: string,
  vaultItem: EncryptedVaultItemInput,
): Promise<ActionResponse> => {
  try {
    const auth = await requireAuthUser();
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const idParsed = updateVaultItemParamsSchema.safeParse({ itemId });
    if (!idParsed.success) {
      return { success: false, error: 'Invalid vault item ID' };
    }

    const parsed = encryptedVaultItemSchema.safeParse(vaultItem);
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault item payload' };
    }

    const result = await prisma.vaultItem.updateMany({
      where: { id: idParsed.data.itemId, userId: auth.user.id },
      data: {
        pinned: parsed.data.pinned,
        ciphertext: parsed.data.ciphertext,
        iv: parsed.data.iv,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'Vault item not found or unauthorized' };
    }

    revalidatePath('/vault');
    return { success: true };
  } catch (error) {
    console.error('Update vault item error:', error);
    return { success: false, error: 'Failed to update vault item' };
  }
};

export const deleteVaultItem = async (id: string): Promise<ActionResponse> => {
  try {
    const auth = await requireAuthUser();
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const parsed = deleteVaultItemSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault item ID' };
    }

    const result = await prisma.vaultItem.deleteMany({
      where: { id: parsed.data.id, userId: auth.user.id },
    });

    if (result.count === 0) {
      return { success: false, error: 'Vault item not found' };
    }

    revalidatePath('/vault');
    return { success: true };
  } catch (error) {
    console.error('Delete vault item error:', error);
    return { success: false, error: 'Failed to delete vault item' };
  }
};

export const toggleVaultItemPin = async (id: string, pinned: boolean): Promise<ActionResponse> => {
  try {
    const auth = await requireAuthUser();
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const parsed = togglePinSchema.safeParse({ id, pinned });
    if (!parsed.success) {
      return { success: false, error: 'Invalid pin payload' };
    }

    const rowsAffected = await prisma.$executeRaw`
      UPDATE "vault"
      SET "pinned" = ${parsed.data.pinned}
      WHERE "id" = ${parsed.data.id} AND "userId" = ${auth.user.id}
    `;

    if (rowsAffected === 0) {
      return { success: false, error: 'Vault item not found' };
    }

    revalidatePath('/vault');
    return { success: true };
  } catch (error) {
    console.error('Toggle pin error:', error);
    return { success: false, error: 'Failed to update pin status' };
  }
};
