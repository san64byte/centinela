'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { resetPasswordSchema } from '@/schemas/auth-schema';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: resetPasswordSchema,
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      await authClient.resetPassword(
        {
          newPassword: value.password,
          token,
        },
        {
          onSuccess: () => {
            toast.success('Password reset successfully. Please sign in with your new password.');
            router.replace('/login');
          },
          onError: (ctx) => {
            const message =
              ctx.error.code === 'INVALID_TOKEN'
                ? 'The password reset link has expired. Please request a new one.'
                : ctx.error.message || 'Something went wrong';
            setError(message);
          },
        },
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex w-full flex-col gap-4"
    >
      <FieldGroup>
        <form.AppField name="password">
          {(field) => <field.PasswordField label="New password" placeholder="Enter new password" />}
        </form.AppField>

        <form.AppField name="confirmPassword">
          {(field) => (
            <field.PasswordField label="Confirm new password" placeholder="Confirm new password" />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                Reset password
              </LoadingButton>
            </Field>
          )}
        </form.Subscribe>

        {error && <FieldError>{error}</FieldError>}
      </FieldGroup>
    </form>
  );
}
