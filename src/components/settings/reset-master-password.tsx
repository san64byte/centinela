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
import { requestResetMasterPassword } from '@/actions/settings.action';
import { toast } from 'sonner';
import { InputPassword } from '../input-password';

export default function ResetMasterPassword() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleResetMasterPassword() {
    if (!password.trim()) {
      toast.error('Please enter your account password.');
      return;
    }

    startTransition(async () => {
      const res = await requestResetMasterPassword(password);

      if (!res.success) {
        toast.error(res.error || 'Something went wrong.');
        return;
      }

      toast.success('Confirmation email sent! Please check your inbox.');
      setPassword('');
      setChecked(false);
      setOpen(false);
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

        <AlertDialog open={open} onOpenChange={setOpen}>
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
                We will send a confirmation link to your email before resetting your master
                password.
              </AlertDialogDescription>
              <div className="mt-2 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-start text-xs text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-0.5">
                  <span className="block font-semibold">Irreversible Action</span>
                  <span className="text-muted-foreground">
                    Since we never store your master password, confirming the reset via email will
                    permanently delete all items in your vault.
                  </span>
                </div>
              </div>
              <FieldGroup className="mt-2 space-y-3">
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

                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="confirm-account-password">Account Password</FieldLabel>
                  <InputPassword
                    id="confirm-account-password"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    className="text-xs"
                  />
                  <FieldDescription className="text-xs">
                    Re-enter your account password to authorize sending the reset confirmation
                    email.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
              <LoadingButton
                variant="destructive"
                loading={isPending}
                disabled={!checked || !password.trim()}
                onClick={handleResetMasterPassword}
              >
                Send confirmation email
              </LoadingButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
