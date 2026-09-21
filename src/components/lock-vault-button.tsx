'use client';

import { useVaultKey } from '@/hooks/use-vault-key';
import { Button } from './ui/button';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function LockVaultButton({ className }: { className?: string }) {
  const { isUnlocked, lock } = useVaultKey();

  if (!isUnlocked) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        lock();
        toast.success('Vault locked successfully');
      }}
      className={
        className ||
        'h-8 gap-1.5 border-border/80 px-3 text-xs font-medium shadow-2xs hover:bg-muted'
      }
      title="Lock your vault immediately"
    >
      <Lock className="size-3.5 text-muted-foreground" />
      <span>Lock Vault</span>
    </Button>
  );
}
