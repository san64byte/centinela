'use server';

import { getServerSession } from '@/lib/get-session';
import prisma from '@/lib/prisma';
import { ActionResponse } from '@/types/action-type';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';

const encryptedVaultItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  url: z.string().trim().optional(),
  pinned: z.boolean().default(false),
  type: z.enum(['ACCOUNT', 'NOTE']),
  ciphertext: z.string().min(1, 'Ciphertext is required'),
  iv: z.string().min(1, 'IV is required'),
});

export type EncryptedVaultItemInput = z.infer<typeof encryptedVaultItemSchema>;

export const createEncryptedVaultItem = async (
  vaultItem: EncryptedVaultItemInput,
): Promise<ActionResponse<{ id: string }>> => {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const parsed = encryptedVaultItemSchema.safeParse(vaultItem);
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault item payload' };
    }

    const created = await prisma.vaultItem.create({
      data: { ...parsed.data, userId: session.user.id },
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
    const session = await getServerSession();
    if (!session?.user || !itemId) {
      return { success: false, error: 'Unauthorized' };
    }

    const parsed = encryptedVaultItemSchema.safeParse(vaultItem);
    if (!parsed.success) {
      return { success: false, error: 'Invalid vault item payload' };
    }

    const result = await prisma.vaultItem.updateMany({
      where: { id: itemId, userId: session.user.id },
      data: { ...parsed.data, updatedAt: new Date() },
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
    const session = await getServerSession();
    if (!session?.user || !id) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await prisma.vaultItem.deleteMany({
      where: { id, userId: session.user.id },
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
    const session = await getServerSession();
    if (!session?.user || !id) {
      return { success: false, error: 'Unauthorized' };
    }

    const rowsAffected = await prisma.$executeRaw`
      UPDATE "vault"
      SET "pinned" = ${pinned}
      WHERE "id" = ${id} AND "userId" = ${session.user.id}
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
