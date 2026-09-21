'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import LoadingButton from '@/components/loading-button';
import { changeEmailSchema } from '@/schemas/auth-schema';
import { useAppForm } from '@/lib/form';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { verifyAccountPassword } from '@/actions/settings.action';

export default function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      email: '',
      currentPassword: '',
    },
    validators: {
      onChange: changeEmailSchema,
      onSubmit: changeEmailSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setStatus(null);

      const verifyRes = await verifyAccountPassword(value.currentPassword);
      if (!verifyRes.success) {
        setError(verifyRes.error || 'Incorrect account password');
        return;
      }

      await authClient.changeEmail(
        {
          newEmail: value.email,
          callbackURL: '/email-change-approved',
        },
        {
          onSuccess: () => {
            const targetEmail = value.email;
            setStatus(
              `Step 1 of 2 sent! Please check your current inbox (${currentEmail}) to approve the request. Once approved, an activation link will be sent to ${targetEmail}.`,
            );
            toast.success('Approval email sent to your current address.');
            form.reset();
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'Failed to initiate email change');
          },
        },
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Email Address</CardTitle>
        <CardDescription>
          Manage the email address associated with your account. Changing your email requires
          two-step verification: approval from your current email, followed by activation from your
          new email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <span className="mb-0.5 block text-muted-foreground">Current Email</span>
            <span className="font-semibold text-foreground">{currentEmail}</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {error && <FieldError>{error}</FieldError>}

            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="New Email"
                  type="email"
                  description=" *Changing your email will automatically revoke all other login sessions on different devices for security reasons."
                  placeholder="new-email@gmail.com"
                />
              )}
            </form.AppField>

            <form.AppField name="currentPassword">
              {(field) => (
                <field.PasswordField
                  label="Current Password"
                  placeholder="Enter your account password"
                  description="Required to confirm your identity before requesting email change."
                />
              )}
            </form.AppField>

            {status && (
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs leading-relaxed text-primary">
                <p className="font-medium">{status}</p>
              </div>
            )}

            <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
              {([isSubmitting, canSubmit]) => (
                <Field orientation="horizontal">
                  <LoadingButton
                    loading={isSubmitting}
                    disabled={!canSubmit || isSubmitting}
                    type="submit"
                  >
                    Save changes
                  </LoadingButton>
                </Field>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
