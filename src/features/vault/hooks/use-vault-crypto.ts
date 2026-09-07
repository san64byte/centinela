'use client';

import { useCallback } from 'react';
import { useVaultKey } from './use-vault-key';
import { decryptData, encryptData, type EncryptedPayload } from '@/lib/crypto/encryption';

/**
 * Hook untuk mengenkripsi dan mendekripsi data
 * menggunakan vaultKey yang sedang aktif.
 */
export function useVaultCrypto() {
  // Ambil vaultKey dari context
  const { vaultKey } = useVaultKey();

  // Fungsi untuk mengenkripsi data
  const encryptItem = useCallback(
    async <T>(data: T): Promise<EncryptedPayload> => {
      // Tidak bisa encrypt jika vault masih terkunci
      if (!vaultKey) throw new Error('Vault is locked — cannot encrypt');

      // Encrypt data menggunakan vaultKey
      return encryptData(data, vaultKey);
    },
    // Buat ulang fungsi jika vaultKey berubah
    [vaultKey],
  );

  // Fungsi untuk mendekripsi data
  const decryptItem = useCallback(
    async <T>(payload: EncryptedPayload): Promise<T> => {
      // Tidak bisa decrypt jika vault masih terkunci
      if (!vaultKey) throw new Error('Vault is locked — cannot decrypt');

      // Decrypt data menggunakan vaultKey
      return decryptData(payload, vaultKey);
    },
    // Buat ulang fungsi jika vaultKey berubah
    [vaultKey],
  );

  // Kembalikan fungsi yang siap digunakan oleh komponen
  return { encryptItem, decryptItem };
}
