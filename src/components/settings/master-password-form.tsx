'use client';

import LoadingButton from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { useVaultKey } from '@/hooks/use-vault-key';
import { User } from '@/lib/auth';
import { changeMasterPassword } from '@/lib/crypto/setup';
import { useAppForm } from '@/lib/form';
import { updateMasterPasswordSchema } from '@/schemas/vault-schema';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateMasterPassword } from '@/actions/settings.action';
import { useRouter } from 'next/navigation';
import ResetMasterPassword from './reset-master-password';

export default function MasterPasswordForm({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { unlock } = useVaultKey();
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
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = [
    'bg-destructive',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-emerald-500',
  ];

  const form = useAppForm({
    defaultValues: {
      currentMasterPassword: '',
      newMasterPassword: '',
    },
    validators: {
      onChange: updateMasterPasswordSchema,
      onSubmit: updateMasterPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      let currentVaultKey;

      try {
        currentVaultKey = await unlock(
          value.currentMasterPassword,
          user.vaultSalt!,
          user.encryptedVaultKey!,
          user.encryptedVaultKeyIv!,
        );
      } catch {
        setError('The current master password is incorrect.');
        return;
      }

      try {
        const { encryptedVaultKey, encryptedVaultKeyIv } = await changeMasterPassword(
          currentVaultKey,
          value.newMasterPassword,
          user.vaultSalt!,
        );

        const res = await updateMasterPassword(encryptedVaultKey, encryptedVaultKeyIv);

        if (!res.success) {
          setError(res.error || 'Failed to change the master password.');
          return;
        }

        toast.success('Master password changed successfully.');
        form.reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('Something went wrong');
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Master Password</CardTitle>
        <CardDescription>
          Update your master password. Your current master password is required to re-encrypt your
          vault key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-0.5">
            <span className="block text-muted-foreground">Master Encryption Key</span>
            <span className="font-medium text-foreground">
              Your master password encrypts and protects your private vault key. Centinela never
              stores this password.
            </span>
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

            <form.AppField name="currentMasterPassword">
              {(field) => (
                <field.PasswordField
                  label="Current Master Password"
                  placeholder="Enter current master password"
                />
              )}
            </form.AppField>

            <form.AppField name="newMasterPassword">
              {(field) => (
                <field.PasswordField
                  label="New Master Password"
                  placeholder="Enter new master password"
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setPasswordStrength(calculateStrenth(e.target.value));
                  }}
                >
                  {field.state.value ? (
                    <div className="mt-2 space-y-2">
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
                  ) : null}
                </field.PasswordField>
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
              {([isSubmitting, canSubmit]) => (
                <Field orientation="horizontal">
                  <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                    Save changes
                  </LoadingButton>
                </Field>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>

        <ResetMasterPassword />
      </CardContent>
    </Card>
  );
}
