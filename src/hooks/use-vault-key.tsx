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

interface VaultKeyContextValue {
  vaultKey: CryptoKey | null;
  isUnlocked: boolean;
  unlock: (
    masterPassword: string,
    vaultSalt: string,
    encryptedVaultKey: string,
    encryptedVaultKeyIv: string,
  ) => Promise<CryptoKey>;
  setUnlockedKey: (vaultKey: CryptoKey) => void;
  lock: () => void;
}

const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export function VaultKeyProvider({ children }: { children: ReactNode }) {
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const unlockingRef = useRef(false);

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

  const setUnlockedKey = useCallback((key: CryptoKey) => {
    setVaultKey(key);
  }, []);

  const lock = useCallback(() => {
    setVaultKey(null);
  }, []);

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

export function useVaultKey() {
  const ctx = useContext(VaultKeyContext);

  if (!ctx) {
    throw new Error('useVaultKey must be used within a VaultKeyProvider');
  }

  return ctx;
}
