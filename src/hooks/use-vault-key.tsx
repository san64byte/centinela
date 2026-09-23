'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { unlockVaultKey } from '@/lib/crypto/keys';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit
const VAULT_SYNC_CHANNEL = 'centinela-vault-sync';

interface VaultKeyContextValue {
  vaultKey: CryptoKey | null;
  isUnlocked: boolean;
  unlock: (
    masterPassword: string,
    vaultSalt: string,
    encryptedVaultKey: string,
    encryptedVaultKeyIv: string,
  ) => Promise<CryptoKey>;
  lock: (broadcast?: boolean) => void;
  broadcastReset: () => void;
  setUnlockedKey: (key: CryptoKey) => void;
}

const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export function VaultKeyProvider({ children }: { children: ReactNode }) {
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const unlockingRef = useRef(false);

  const lock = useCallback((broadcast: boolean = true) => {
    setVaultKey(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (broadcast && typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        channelRef.current?.postMessage({ type: 'VAULT_LOCK' });
      } catch {
        // ignore
      }
    }
  }, []);

  const broadcastReset = useCallback(() => {
    lock(false);
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        channelRef.current?.postMessage({ type: 'VAULT_RESET' });
      } catch {
        // ignore
      }
    }
  }, [lock]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(VAULT_SYNC_CHANNEL);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data?.type === 'VAULT_LOCK') {
        lock(false);
      } else if (event.data?.type === 'VAULT_RESET') {
        lock(false);
        if (window.location.pathname.startsWith('/vault')) {
          window.location.href = '/setup-vault';
        }
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [lock]);

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
        const key = await unlockVaultKey(
          masterPassword,
          vaultSalt,
          encryptedVaultKey,
          encryptedVaultKeyIv,
          false,
        );

        lastActivityRef.current = Date.now();
        setVaultKey(key);
        return key;
      } finally {
        unlockingRef.current = false;
      }
    },
    [],
  );

  const setUnlockedKey = useCallback((key: CryptoKey) => {
    if (key.extractable) {
      console.warn(
        'Attempted to store extractable key in VaultKeyProvider. Refusing for security.',
      );
      return;
    }
    lastActivityRef.current = Date.now();
    setVaultKey(key);
  }, []);

  // Auto-lock timer based on user inactivity
  useEffect(() => {
    if (!vaultKey) return;

    lastActivityRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const intervalId = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        lock();
        toast.info('Vault locked due to 15 minutes of inactivity.');
      }
    }, 10_000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [vaultKey, lock]);

  const value = useMemo(
    () => ({
      vaultKey,
      isUnlocked: vaultKey !== null,
      unlock,
      setUnlockedKey,
      lock,
      broadcastReset,
    }),
    [vaultKey, unlock, setUnlockedKey, lock, broadcastReset],
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
