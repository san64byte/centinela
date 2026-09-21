'use client';

import { confirmResetMasterPassword } from '@/actions/settings.action';
import LoadingButton from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { useVaultKey } from '@/hooks/use-vault-key';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

export default function ConfirmResetVaultForm({ token }: { token?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { lock } = useVaultKey();

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-xs text-destructive">
          Invalid or missing reset token. Please request a new reset link from settings.
        </p>
        <Button variant="outline" asChild className="w-full">
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </div>
    );
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmResetMasterPassword(token!);

      if (!res.success) {
        setError(res.error || 'Failed to confirm master password reset.');
        toast.error(res.error || 'Failed to confirm master password reset.');
        return;
      }

      lock();
      toast.success('Master password reset successfully. All vault items have been erased.');
      router.push('/setup-vault');
    });
  }

  return (
    <div className="space-y-5 text-start">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <span className="block font-semibold">Irreversible Action</span>
          <p className="text-muted-foreground">
            Confirming this request will{' '}
            <strong>permanently erase all encrypted credentials</strong> in your vault and allow you
            to configure a new master password.
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 pt-2">
        <LoadingButton
          variant="destructive"
          loading={isPending}
          onClick={handleConfirm}
          className="w-full gap-1.5"
        >
          <RotateCcw className="size-4" />
          Permanently Erase Vault & Reset
        </LoadingButton>

        <Button variant="outline" asChild disabled={isPending} className="w-full">
          <Link href="/settings">Cancel and Return to Settings</Link>
        </Button>
      </div>
    </div>
  );
}
