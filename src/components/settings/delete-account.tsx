'use client';

import LoadingButton from '@/components/loading-button';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { useVaultKey } from '@/hooks/use-vault-key';
import { authClient } from '@/lib/auth-client';
import { verifyAccountPassword } from '@/actions/settings.action';
import { Trash2, TriangleAlert } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { InputPassword } from '../input-password';

export default function DeleteAccount() {
  const { lock } = useVaultKey();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDeleteAccount() {
    if (!password.trim()) {
      toast.error('Please enter your account password.');
      return;
    }

    startTransition(async () => {
      const verifyRes = await verifyAccountPassword(password);
      if (!verifyRes.success) {
        toast.error(verifyRes.error || 'Incorrect account password');
        return;
      }

      const { error } = await authClient.deleteUser({
        callbackURL: '/goodbye',
      });

      if (error) {
        toast.error(error.message ?? 'Failed to send the confirmation email.');
        return;
      }

      lock();
      toast.info('Check your email for the account deletion confirmation.');
      setSent(true);
      setPassword('');
      setChecked(false);
      setOpen(false);
    });
  }

  if (sent) {
    return (
      <Card className="ring-destructive/50">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to your email. Click the link to complete the
            account deletion.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="ring-destructive/50">
      <CardHeader>
        <CardTitle className="font-semibold text-destructive">Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and everything in your vault. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              type="button"
              className="max-w-fit gap-2 border-destructive"
            >
              <Trash2 className="size-4" />
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm" className="sm:min-w-md">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                We&apos;ll send a confirmation link to your email to complete this process.
              </AlertDialogDescription>
              <div className="mt-2 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-start text-xs text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-0.5">
                  <span className="block font-semibold">Danger Zone</span>
                  <span className="text-muted-foreground">
                    Permanently delete your account and everything in your vault. This action cannot
                    be undone.
                  </span>
                </div>
              </div>
              <FieldGroup className="mt-2 space-y-3">
                <Field orientation="horizontal">
                  <Checkbox
                    id="delete-account-confirm"
                    onCheckedChange={(value) => setChecked(value === true)}
                    checked={checked}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="delete-account-confirm">
                      I understand this is permanent
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      All vault items and account data will be lost forever.
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="delete-account-password">Account Password</FieldLabel>
                  <InputPassword
                    id="delete-account-password"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    className="text-xs"
                  />
                  <FieldDescription className="text-xs">
                    Re-enter your account password to authorize sending the deletion confirmation
                    email.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                variant="outline"
                onClick={() => {
                  setPassword('');
                  setChecked(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <LoadingButton
                variant="destructive"
                loading={isPending}
                disabled={!checked || !password.trim() || isPending}
                onClick={handleDeleteAccount}
              >
                Send confirmation
              </LoadingButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
