import { create } from 'zustand';

interface SignOutState {
  isSignOut: boolean;
  setSignOut: (value: boolean) => void;
}

export const useSignOutState = create<SignOutState>((set) => ({
  isSignOut: false,
  setSignOut: (value) => set({ isSignOut: value }),
}));
