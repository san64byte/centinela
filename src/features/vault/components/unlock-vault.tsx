import { InputPassword } from '@/components/input-password';
import LoadingButton from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useVaultKey } from '../hooks/use-vault-key';
import { User } from '@/lib/auth';
import { unlockVaultSchema } from '../schemas/vault-schema';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react';

export default function UnlockVault({ user }: { user: User }) {
  const [open, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { unlock } = useVaultKey();

  const form = useForm({
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
        setDialogOpen(false);
        form.reset();
      } catch {
        setError('Incorrect master password');
        toast.error('Incorrect master password');
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setDialogOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <LockKeyholeOpen className="size-4" /> <span>Unlock Vault</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </div>
          <DialogTitle className="text-center text-xl">Unlock Vault</DialogTitle>
          <DialogDescription className="text-center">
            Enter your Master Password to unlock items and decrypt your credentials in the browser.
          </DialogDescription>
        </DialogHeader>

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
                        if (error) setError(null);
                      }}
                      placeholder="Enter your password"
                      autoFocus
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
            <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
              {([isSubmitting, canSubmit]) => (
                <Field>
                  <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                    Unlock
                  </LoadingButton>
                </Field>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
