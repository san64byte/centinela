'use client';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import LoadingButton from '@/components/loading-button';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function VerifyEmailForm({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  function handleResend() {
    if (isPending) return;

    startTransition(async () => {
      try {
        const { error } = await authClient.sendVerificationEmail({
          email,
          callbackURL: '/vault',
        });

        if (error) {
          toast.error(error.message || 'Failed to resend verification email');
          return;
        }

        toast.success('Verification email sent! Please check your inbox.');
      } catch {
        toast.error('Failed to resend verification email. Please try again.');
      }
    });
  }

  function handleCheckStatus() {
    setIsChecking(true);
    router.refresh();
    setTimeout(() => {
      setIsChecking(false);
      toast.info('Checking verification status...');
    }, 800);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <LoadingButton type="button" loading={isPending} onClick={handleResend} className="w-full">
        Resend verification email
      </LoadingButton>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isChecking}
        onClick={handleCheckStatus}
        className="h-8 text-xs text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className={`mr-1.5 size-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        Already verified? Check status
      </Button>
    </div>
  );
}
