'use client';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import LoadingButton from '@/components/loading-button';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useSyncExternalStore, useTransition } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function VerifyEmailForm({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const storageKey = `verify_email_cooldown_${email.toLowerCase()}`;

  const subscribe = useCallback((callback: () => void) => {
    const interval = setInterval(callback, 1000);
    window.addEventListener('storage', callback);
    window.addEventListener('email-cooldown-updated', callback);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', callback);
      window.removeEventListener('email-cooldown-updated', callback);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return 0;
      const elapsed = Math.floor((Date.now() - parseInt(saved, 10)) / 1000);
      const remaining = 60 - elapsed;
      if (remaining > 0) return remaining;
      localStorage.removeItem(storageKey);
      return 0;
    } catch {
      return 0;
    }
  }, [storageKey]);

  const getServerSnapshot = () => 0;

  const cooldown = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function handleResend() {
    if (cooldown > 0 || isPending) return;

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
        try {
          localStorage.setItem(storageKey, Date.now().toString());
          window.dispatchEvent(new Event('email-cooldown-updated'));
        } catch {
          // Ignore storage access errors
        }
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
      <LoadingButton
        type="button"
        loading={isPending}
        disabled={cooldown > 0}
        onClick={handleResend}
        className="w-full"
      >
        {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
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
