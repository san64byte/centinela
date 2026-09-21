'use client';

import LoadingButton from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { useVaultKey } from '@/hooks/use-vault-key';
import type { User } from '@/lib/auth';
import { unlockVaultSchema } from '@/schemas/vault-schema';
import { useAppForm } from '@/lib/form';
import { useState } from 'react';
import { toast } from 'sonner';
import { LockKeyhole } from 'lucide-react';

export default function UnlockVault({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null);
  const { unlock } = useVaultKey();

  const form = useAppForm({
    defaultValues: {
      masterPassword: '',
    },
    validators: {
      onSubmit: unlockVaultSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await unlock(
          value.masterPassword,
          user.vaultSalt!,
          user.encryptedVaultKey!,
          user.encryptedVaultKeyIv!,
        );
        toast.success('Vault unlocked');
        form.reset();
      } catch {
        setError('Incorrect master password');
        toast.error('Incorrect master password');
      }
    },
  });

  return (
    <div className="flex w-full justify-center py-10">
      <Card className="w-full max-w-md border-border/70 shadow-xs sm:rounded-2xl">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
            <LockKeyhole className="size-6" />
          </div>
          <CardTitle as="h2" className="text-xl font-semibold tracking-tight text-foreground">
            Unlock Your Vault
          </CardTitle>
          <CardDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Enter your Master Password to decrypt your credentials locally in your browser.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex w-full flex-col gap-4"
          >
            <FieldGroup>
              {error && <FieldError>{error}</FieldError>}

              <form.AppField name="masterPassword">
                {(field) => (
                  <field.PasswordField
                    label="Master Password"
                    placeholder="Enter your master password"
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      if (error) setError(null);
                    }}
                    autoFocus
                  />
                )}
              </form.AppField>

              <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
                {([isSubmitting, canSubmit]) => (
                  <Field>
                    <LoadingButton
                      loading={isSubmitting}
                      disabled={!canSubmit}
                      type="submit"
                      className="w-full"
                    >
                      Unlock Vault
                    </LoadingButton>
                  </Field>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
