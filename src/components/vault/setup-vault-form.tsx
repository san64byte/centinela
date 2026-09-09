'use client';

import { Button } from '@/components/ui/button';
import { InputPassword } from '@/components/input-password';
import LoadingButton from '@/components/loading-button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { User } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import React, { useState } from 'react';
import { saveEncryptedVaultKey } from '@/actions/setup-vault.action';
import { useVaultKey } from '@/hooks/use-vault-key';
import { useRouter } from 'next/navigation';
import { setupMasterPassword } from '@/lib/crypto/setup';
import { setupMasterPasswordSchema } from '@/schemas/vault-schema';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import PasswordGenerator from '@/components/password-generator';

interface SetupVaultFormProps extends React.ComponentProps<'form'> {
  user: User;
}

export default function SetupVaultForm({ user, className, ...props }: SetupVaultFormProps) {
  const { setUnlockedKey } = useVaultKey();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showGenerator, setShowGenerator] = useState(false);
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
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor={field.name}>Master Password</FieldLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowGenerator((prev) => !prev)}
                    className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Sparkles className="size-3 text-primary" />
                    <span>{showGenerator ? 'Hide generator' : 'Generate master password'}</span>
                  </Button>
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
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                            i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Strength:{' '}
                      <span className="font-semibold text-foreground">
                        {strengthLabels[Math.max(0, passwordStrength - 1)] || 'Very Weak'}
                      </span>
                    </p>
                  </div>
                )}
                {showGenerator && (
                  <PasswordGenerator
                    variant="master"
                    onApply={(pwd: string) => {
                      field.handleChange(pwd);
                      form.setFieldValue('confirmMasterPassword', pwd);
                      setPasswordStrength(calculateStrenth(pwd));
                      setShowGenerator(false);
                      toast.success('Master password applied to confirmation');
                    }}
                    onClose={() => setShowGenerator(false)}
                  />
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

        <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 text-start shadow-2xs">
          <p className="text-xs leading-relaxed text-muted-foreground">
            This password will be used to encrypt all your vault data. Centinela uses zero-knowledge
            encryption: never share it and never forget it, as it cannot be recovered.
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
