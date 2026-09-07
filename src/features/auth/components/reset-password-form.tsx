'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { withPasswordSchema } from '@/features/auth/schemas/auth-schema';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      password: '',
    },
    validators: {
      onChange: withPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.resetPassword(
        {
          newPassword: value.password,
          token,
        },
        {
          onSuccess: () => {
            setSuccess('Password has been reset. You can now sign in.');
            setTimeout(() => router.push('/login'), 3000);
            form.reset();
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

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                reset password
              </LoadingButton>
            </Field>
          )}
        </form.Subscribe>

        {error && <FieldError>{error}</FieldError>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </FieldGroup>
    </form>
  );
}
