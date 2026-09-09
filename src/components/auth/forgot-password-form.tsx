'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { withEmailSchema } from '@/schemas/auth-schema';
import { useState } from 'react';

export default function ForgotPasswordForm() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onChange: withEmailSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(null);
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: '/reset-password',
        },
        {
          onSuccess: () => {
            setSuccess(
              'If your account is registered, a password reset link has been sent. Didn’t receive the email within 5 minutes? Try sending it again.',
            );
            form.reset();
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'Something went wrong');
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
        <form.AppField name="email">
          {(field) => <field.TextField label="Email" placeholder="your@gmail.com" />}
        </form.AppField>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                Send reset link
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
