'use client';

import LoadingButton from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import { useVaultKey } from '@/hooks/use-vault-key';
import type { User } from '@/lib/auth';
import { changeMasterPassword } from '@/lib/crypto/setup';
import { unlockVaultKey } from '@/lib/crypto/keys';
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
  const { setUnlockedKey } = useVaultKey();
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      accountPassword: '',
      currentMasterPassword: '',
      newMasterPassword: '',
    },
    validators: {
      onChange: updateMasterPasswordSchema,
      onSubmit: updateMasterPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      let tempVaultKey: CryptoKey;

      try {
        tempVaultKey = await unlockVaultKey(
          value.currentMasterPassword,
          user.vaultSalt!,
          user.encryptedVaultKey!,
          user.encryptedVaultKeyIv!,
          true,
        );
      } catch {
        setError('The current master password is incorrect.');
        return;
      }

      try {
        const {
          authProof,
          newVaultSalt,
          newVaultVerifier,
          encryptedVaultKey,
          encryptedVaultKeyIv,
        } = await changeMasterPassword(
          tempVaultKey,
          value.currentMasterPassword,
          user.vaultSalt!,
          value.newMasterPassword,
        );

        const res = await updateMasterPassword(
          encryptedVaultKey,
          encryptedVaultKeyIv,
          value.accountPassword,
          {
            newVaultSalt,
            newVaultVerifier,
            authProof,
          },
        );

        if (!res.success) {
          setError(res.error || 'Failed to change the master password.');
          return;
        }

        try {
          const safeKey = await unlockVaultKey(
            value.newMasterPassword,
            newVaultSalt,
            encryptedVaultKey,
            encryptedVaultKeyIv,
            false,
          );
          setUnlockedKey(safeKey);
        } catch {
          // Fallback if re-unwrap fails in background
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

            <form.AppField name="accountPassword">
              {(field) => (
                <field.PasswordField
                  label="Account Password"
                  placeholder="Enter your account login password"
                />
              )}
            </form.AppField>

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
                >
                  <PasswordStrengthMeter password={field.state.value} />
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
