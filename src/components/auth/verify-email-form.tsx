'use client';

import { authClient } from '@/lib/auth-client';
import LoadingButton from '@/components/loading-button';
import { useTransition } from 'react';
import { toast } from 'sonner';

export default function VerifyEmailForm({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();

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

  return (
    <LoadingButton type="button" loading={isPending} onClick={handleResend} className="w-full">
      Resend verification email
    </LoadingButton>
  );
}
