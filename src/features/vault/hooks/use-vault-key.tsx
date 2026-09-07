'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { deriveMasterKey, unwrapVaultKey } from '@/lib/crypto/keys';

/**
 * Data dan fungsi yang bisa diakses oleh seluruh aplikasi
 * melalui useVaultKey().
 */
interface VaultKeyContextValue {
  // Vault Key yang disimpan di memori browser.
  // Akan bernilai null jika vault masih terkunci.
  vaultKey: CryptoKey | null;

  // Status apakah vault sudah berhasil dibuka.
  isUnlocked: boolean;

  /**
   * Membuka vault menggunakan Master Password.
   *
   * Alur:
   * Master Password
   * -> derive Master Key
   * -> decrypt (unwrap) Vault Key
   * -> simpan Vault Key ke Context
   */
  unlock: (
    masterPassword: string,
    vaultSalt: string,
    encryptedVaultKey: string,
    encryptedVaultKeyIv: string,
  ) => Promise<CryptoKey>;

  /**
   * Digunakan ketika Vault Key sudah tersedia.
   *
   * Contoh:
   * Setelah user pertama kali membuat Master Password,
   * aplikasi baru saja membuat Vault Key sehingga
   * tidak perlu di-unlock lagi.
   */
  setUnlockedKey: (vaultKey: CryptoKey) => void;

  /**
   * Menghapus Vault Key dari memori
   * sehingga vault kembali terkunci.
   */
  lock: () => void;
}

// Context global untuk menyimpan Vault Key
const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export function VaultKeyProvider({ children }: { children: ReactNode }) {
  // Menyimpan Vault Key di memory browser.
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  /**
   * Penanda apakah proses unlock sedang berjalan.
   *
   * Tujuannya agar user tidak bisa menekan tombol
   * Unlock berkali-kali secara bersamaan.
   */
  const unlockingRef = useRef(false);

  /**
   * Membuka Vault Key dari data terenkripsi.
   *
   * Dipakai ketika user login kembali
   * dan Vault Key sudah tidak ada di memory.
   */
  const unlock = useCallback(
    async (
      masterPassword: string,
      vaultSalt: string,
      encryptedVaultKey: string,
      encryptedVaultKeyIv: string,
    ): Promise<CryptoKey> => {
      if (unlockingRef.current) {
        throw new Error('Unlock already in progress');
      }

      unlockingRef.current = true;

      try {
        const masterKey = await deriveMasterKey(masterPassword, vaultSalt);
        const key = await unwrapVaultKey(encryptedVaultKey, encryptedVaultKeyIv, masterKey);

        setVaultKey(key);
        return key;
      } finally {
        unlockingRef.current = false;
      }
    },
    [],
  );

  /**
   * Menyimpan Vault Key yang sudah dimiliki.
   *
   * Dipakai saat setup Master Password pertama kali
   * karena Vault Key baru saja dibuat.
   */
  const setUnlockedKey = useCallback((key: CryptoKey) => {
    setVaultKey(key);
  }, []);

  /**
   * Menghapus Vault Key dari memory.
   * Biasanya dipanggil saat logout atau lock vault.
   */
  const lock = useCallback(() => {
    setVaultKey(null);
  }, []);

  /**
   * Data yang akan dibagikan ke seluruh aplikasi.
   *
   * useMemo digunakan agar object ini tidak dibuat ulang
   * setiap kali komponen melakukan render.
   */
  const value = useMemo(
    () => ({
      vaultKey,
      isUnlocked: vaultKey !== null,
      unlock,
      setUnlockedKey,
      lock,
    }),
    [vaultKey, unlock, setUnlockedKey, lock],
  );

  return <VaultKeyContext.Provider value={value}>{children}</VaultKeyContext.Provider>;
}

/**
 * Custom Hook untuk mengambil VaultKeyContext.
 *
 * Contoh:
 * const { vaultKey, unlock, lock } = useVaultKey();
 */
export function useVaultKey() {
  const ctx = useContext(VaultKeyContext);

  // Mencegah hook dipakai di luar Provider.
  if (!ctx) {
    throw new Error('useVaultKey must be used within a VaultKeyProvider');
  }

  return ctx;
}
