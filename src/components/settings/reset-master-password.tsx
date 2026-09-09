'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useTransition } from 'react';
import LoadingButton from '@/components/loading-button';
import { resetMasterPassword } from '@/actions/settings.action';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useVaultKey } from '@/hooks/use-vault-key';

export default function ResetMasterPassword() {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { lock } = useVaultKey();

  function handleResetMasterPassword() {
    startTransition(async () => {
      const res = await resetMasterPassword();

      if (!res.success) {
        toast.error(res.error || 'Something went wrong.');
        return;
      }

      lock();
      toast.success('Master password reset successfully.');
      router.push('/setup-vault');
    });
  }

  return (
    <div className="border-t pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-destructive">Reset Master Password</span>
          <p className="text-xs text-muted-foreground">
            Forgot your master password? Resetting will generate a new vault key and permanently
            delete all items in your vault.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              type="button"
              className="shrink-0 gap-2 border-destructive"
            >
              <RotateCcw className="size-4" />
              Reset master password
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm" className="sm:min-w-md">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <RotateCcw />
              </AlertDialogMedia>
              <AlertDialogTitle>Reset master password?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reset your master password?
              </AlertDialogDescription>
              <div className="mt-2 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-start text-xs text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-0.5">
                  <span className="block font-semibold">Irreversible Action</span>
                  <span className="text-muted-foreground">
                    Since we never store your master password, resetting it will immediately and
                    permanently delete all items in your vault.
                  </span>
                </div>
              </div>
              <FieldGroup className="mt-2">
                <Field orientation="horizontal">
                  <Checkbox
                    id="terms-checkbox-desc"
                    name="terms-checkbox-desc"
                    onCheckedChange={(value) => setChecked(value === true)}
                    checked={checked}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="terms-checkbox-desc">
                      I understand this action is permanent
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      Resetting the master password will permanently erase all encrypted items in my
                      vault.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
              <LoadingButton
                variant="destructive"
                loading={isPending}
                disabled={!checked}
                onClick={handleResetMasterPassword}
              >
                Reset
              </LoadingButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
