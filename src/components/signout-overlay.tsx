'use client';

import { useSignOutState } from '@/hooks/use-signout';
import { LoaderIcon } from 'lucide-react';

export function SignOutOverlay() {
  const isSigningOut = useSignOutState((s) => s.isSignOut);
  if (!isSigningOut) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <LoaderIcon role="status" aria-label="Loading" className="size-4 animate-spin" />
        <p className="text-sm text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
}
