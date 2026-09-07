'use client';

import { InputPassword } from '@/components/input-password';
import LoadingButton from '@/components/loading-button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { User } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import React, { useState } from 'react';
import { saveEncryptedVaultKey } from '../actions/setup-vault.action';
import { useVaultKey } from '../hooks/use-vault-key';
import { useRouter } from 'next/navigation';
import { setupMasterPassword } from '@/lib/crypto/setup';
import { setupMasterPasswordSchema } from '../schemas/vault-schema';

interface SetupVaultFormProps extends React.ComponentProps<'form'> {
  user: User;
}

export default function SetupVaultForm({ user, className, ...props }: SetupVaultFormProps) {
  const { setUnlockedKey } = useVaultKey();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const calculateStrenth = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const form = useForm({
    defaultValues: {
      masterPassword: '',
      confirmMasterPassword: '',
    },
    validators: {
      onSubmit: setupMasterPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const { vaultKey, encryptedVaultKey, encryptedVaultKeyIv } = await setupMasterPassword(
          value.masterPassword,
          user.vaultSalt!,
        );

        const res = await saveEncryptedVaultKey(encryptedVaultKey, encryptedVaultKeyIv);

        if (res.success) {
          setUnlockedKey(vaultKey!);
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

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = [
    'bg-destructive',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-emerald-500',
  ];

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

        <form.Field name="masterPassword">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid} className="text-start">
                <div className="flex items-center">
                  <FieldLabel htmlFor={field.name}>Master Password</FieldLabel>
                </div>
                <InputPassword
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setPasswordStrength(calculateStrenth(e.target.value));
                  }}
                  placeholder="Create strong password"
                  autoFocus
                />
                {field.state.value && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: {strengthLabels[Math.max(0, passwordStrength - 1)] || 'Very Weak'}
                    </p>
                  </div>
                )}
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="confirmMasterPassword">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid} className="text-start">
                <div className="flex items-center">
                  <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                </div>
                <InputPassword
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Confirm your password"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <div className="rounded-lg border border-secondary/50 bg-secondary/30 p-3 text-start">
          <p className="text-xs leading-relaxed text-muted-foreground">
            This password will be used to encrypt all your vault data. Never share it and never
            forget it.
          </p>
        </div>
        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                Create Vault
              </LoadingButton>
            </Field>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
}
