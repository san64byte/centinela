'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import type { User } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAppForm } from '@/lib/form';
import React, { useState } from 'react';
import { saveEncryptedVaultKey } from '@/actions/setup-vault.action';
import { useVaultKey } from '@/hooks/use-vault-key';
import { useRouter } from 'next/navigation';
import { setupMasterPassword } from '@/lib/crypto/setup';
import { unlockVaultKey } from '@/lib/crypto/keys';
import { setupMasterPasswordSchema } from '@/schemas/vault-schema';

interface SetupVaultFormProps extends React.ComponentProps<'form'> {
  user: User;
}

export default function SetupVaultForm({ user, className, ...props }: SetupVaultFormProps) {
  const { setUnlockedKey } = useVaultKey();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      accountPassword: '',
      masterPassword: '',
      confirmMasterPassword: '',
    },
    validators: {
      onChange: setupMasterPasswordSchema,
      onSubmit: setupMasterPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const { encryptedVaultKey, encryptedVaultKeyIv, vaultVerifier } = await setupMasterPassword(
          value.masterPassword,
          user.vaultSalt!,
        );

        const res = await saveEncryptedVaultKey(
          encryptedVaultKey,
          encryptedVaultKeyIv,
          value.accountPassword,
          vaultVerifier,
        );

        if (res.success) {
          const safeKey = await unlockVaultKey(
            value.masterPassword,
            user.vaultSalt!,
            encryptedVaultKey,
            encryptedVaultKeyIv,
            false,
          );
          setUnlockedKey(safeKey);
          setError(null);
          router.push('/vault');
        } else {
          setError(res.error || 'Failed to set up the master password.');
        }
      } catch {
        setError('Failed to set up the master password.');
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={cn('flex w-full flex-col gap-4', className)}
      {...props}
    >
      <FieldGroup>
        {error && <FieldError>{error}</FieldError>}

        <form.AppField name="accountPassword">
          {(field) => (
            <field.PasswordField
              label="Account Password"
              placeholder="Enter your account login password"
              description="Confirm your identity and verify your master password is distinct."
              autoFocus
            />
          )}
        </form.AppField>

        <form.AppField name="masterPassword">
          {(field) => (
            <field.PasswordField label="Master Password" placeholder="Create strong password">
              <PasswordStrengthMeter password={field.state.value} />
            </field.PasswordField>
          )}
        </form.AppField>

        <form.AppField name="confirmMasterPassword">
          {(field) => (
            <field.PasswordField label="Confirm Password" placeholder="Confirm your password" />
          )}
        </form.AppField>

        <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/20 p-3.5 text-start shadow-2xs">
          <p className="text-xs leading-relaxed text-muted-foreground">
            This password will be used to encrypt all your vault data. Centinela uses zero-knowledge
            encryption: never share it and never forget it, as it cannot be recovered.
          </p>
          <p className="text-[11px] leading-relaxed font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Important: Never reuse your account login password as your master password.
          </p>
        </div>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton
                loading={isSubmitting}
                disabled={!canSubmit}
                type="submit"
                className="w-full font-medium shadow-2xs"
              >
                Create Vault
              </LoadingButton>
            </Field>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
}
