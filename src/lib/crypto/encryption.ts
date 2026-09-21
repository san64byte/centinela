import { base64ToBuffer, bufferToBase64, generateIvBytes } from './encoding';
import type { DecryptedVaultItem, EncryptedVaultPayload } from '@/types/vault-type';
import type { VaultItem as PrismaVaultItem } from '@/lib/generated/prisma/client';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

export async function encryptData<T>(data: T, vaultKey: CryptoKey): Promise<EncryptedPayload> {
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

  const iv = generateIvBytes();

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    new TextEncoder().encode(plaintext),
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

export async function decryptData<T = string>(
  payload: EncryptedPayload,
  vaultKey: CryptoKey,
): Promise<T> {
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    vaultKey,
    base64ToBuffer(payload.ciphertext),
  );

  const plaintext = new TextDecoder().decode(plaintextBuffer);

  try {
    return JSON.parse(plaintext) as T;
  } catch {
    return plaintext as unknown as T;
  }
}

/**
 * Decrypts a single Prisma VaultItem record into a DecryptedVaultItem.
 */
export async function decryptVaultItem(
  item: PrismaVaultItem,
  vaultKey: CryptoKey,
): Promise<DecryptedVaultItem> {
  const decrypted = await decryptData<EncryptedVaultPayload>(
    { ciphertext: item.ciphertext, iv: item.iv },
    vaultKey,
  );

  return {
    id: item.id,
    userId: item.userId,
    pinned: item.pinned,
    encVersion: item.encVersion,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...decrypted,
  } as DecryptedVaultItem;
}
