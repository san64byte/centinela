'use client';

import { useSyncExternalStore } from 'react';

let isSigningOut = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setSignOut(value: boolean) {
  if (isSigningOut !== value) {
    isSigningOut = value;
    notify();
  }
}

export function useSignOutState() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => isSigningOut,
    () => false,
  );
}
