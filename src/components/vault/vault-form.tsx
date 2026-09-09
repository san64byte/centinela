'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup } from '@/components/ui/field';
import LoadingButton from '@/components/loading-button';
import { DecryptedVaultItem, VaultItemFormInput } from '@/types/vault-type';
import { vaultItemFormSchema } from '@/schemas/vault-schema';
import { useEffect } from 'react';
import { useAppForm } from '@/lib/form';
import { encryptData } from '@/lib/crypto/encryption';
import { useVaultKey } from '@/hooks/use-vault-key';
import { createEncryptedVaultItem, updateEncryptedVaultItem } from '@/actions/vault.action';
import isEqual from 'lodash.isequal';
import { toast } from 'sonner';
import { VaultItemType } from '@/lib/generated/prisma/enums';
import { FileText, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

function defaultAccountValues(): VaultItemFormInput {
  return {
    title: '',
    url: '',
    pinned: false,
    type: 'ACCOUNT',
    data: {
      email: '',
      username: '',
      phone: '',
      password: '',
      pin: '',
      notes: '',
    },
  };
}

function defaultNoteValues(): VaultItemFormInput {
  return {
    title: '',
    url: '',
    pinned: false,
    type: 'NOTE',
    data: {
      content: '',
    },
  };
}

function toFormValues(item: DecryptedVaultItem): VaultItemFormInput {
  const base = { title: item.title, url: item.url ?? undefined, pinned: item.pinned };

  if (item.type === 'ACCOUNT') {
    const { email, username, phone, password, pin, notes } = item.data;
    return { ...base, type: 'ACCOUNT', data: { email, username, phone, password, pin, notes } };
  }

  return { ...base, type: 'NOTE', data: { content: item.data.content } };
}

function getInitialValues(
  existingItem?: DecryptedVaultItem | null,
  type: VaultItemType = 'ACCOUNT',
): VaultItemFormInput {
  if (existingItem) {
    return toFormValues(existingItem);
  }
  return type === 'NOTE' ? defaultNoteValues() : defaultAccountValues();
}

interface VaultFormProps {
  open: boolean;
  type?: VaultItemType;
  onOpenChange: (open: boolean) => void;
  existingItem?: DecryptedVaultItem | null;
}

export default function VaultForm({
  open,
  type = 'ACCOUNT',
  onOpenChange,
  existingItem,
}: VaultFormProps) {
  const { vaultKey } = useVaultKey();

  const router = useRouter();

  const isEditMode = Boolean(existingItem);

  const form = useAppForm({
    defaultValues: getInitialValues(existingItem, type),
    validators: {
      onChange: vaultItemFormSchema,
      onSubmit: vaultItemFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!vaultKey) {
        toast.error('Vault is locked. Please unlock first.');
        return;
      }

      const parsed = vaultItemFormSchema.parse(value);

      if (isEditMode && existingItem) {
        const originalValues = vaultItemFormSchema.parse(toFormValues(existingItem));
        if (isEqual(parsed, originalValues)) {
          toast('No changes to save');
          onOpenChange(false);
          return;
        }
      }

      try {
        const { data, ...others } = value;

        // Preserve and track credential history when editing account
        let dataToEncrypt = data;
        if (isEditMode && existingItem?.type === 'ACCOUNT' && value.type === 'ACCOUNT') {
          const history = [...(existingItem.data.credentialHistory ?? [])];
          const oldPwd = existingItem.data.password;
          const newPwd = value.data.password;
          const oldPin = existingItem.data.pin;
          const newPin = value.data.pin;

          if (oldPwd && newPwd && oldPwd !== newPwd) {
            history.unshift({
              type: 'PASSWORD',
              value: oldPwd,
              changedAt: new Date().toISOString(),
            });
          }
          if (oldPin && newPin && oldPin !== newPin) {
            history.unshift({
              type: 'PIN',
              value: oldPin,
              changedAt: new Date().toISOString(),
            });
          }

          dataToEncrypt = {
            ...data,
            credentialHistory: history.length > 0 ? history : undefined,
          };
        }

        const { ciphertext, iv } = await encryptData(dataToEncrypt, vaultKey);

        const payload = { ...others, ciphertext, iv };
        const res =
          isEditMode && existingItem
            ? await updateEncryptedVaultItem(existingItem.id, payload)
            : await createEncryptedVaultItem(payload);

        if (!res.success) {
          toast.error(res.error || 'Something went wrong');
          return;
        }

        toast.success(isEditMode ? 'Vault updated successfully' : 'Vault created successfully');
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error('Something went wrong');
      }
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset(getInitialValues(existingItem, type));
  }, [open, type, existingItem, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
              {type === 'ACCOUNT' ? (
                <UserRound className="size-5" />
              ) : (
                <FileText className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {isEditMode
                  ? `Edit ${existingItem?.type === 'NOTE' ? 'Note' : 'Account'}`
                  : `Add New ${type === 'NOTE' ? 'Note' : 'Account'}`}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs font-normal text-muted-foreground">
                All sensitive fields are encrypted with AES-GCM locally before saving.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="-mx-4 max-h-[55vh] space-y-4 overflow-y-auto px-4 py-1">
            <FieldGroup>
              <form.AppField name="title">
                {(field) => <field.TextField label="Title" placeholder="e.g. Account Gmail" />}
              </form.AppField>

              <form.AppField name="url">
                {(field) => (
                  <field.TextField type="url" label="URL" placeholder="e.g. https://example.com" />
                )}
              </form.AppField>

              {/* Dynamic Form */}
              <form.Subscribe selector={(state) => state.values.type}>
                {(type) =>
                  type === 'ACCOUNT' ? (
                    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 shadow-2xs">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Provide at least one identifier (email/username/phone) and one credential
                        (password/PIN).
                      </p>

                      <form.AppField name="data.email">
                        {(field) => (
                          <field.TextField
                            label="Email"
                            type="email"
                            placeholder="e.g. user@example.com"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            data-bwignore
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="data.username">
                        {(field) => (
                          <field.TextField
                            label="Username"
                            placeholder="e.g. alex_smith"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            data-bwignore
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="data.phone">
                        {(field) => (
                          <field.TextField
                            label="Phone"
                            type="tel"
                            inputMode="tel"
                            placeholder="e.g. +1 555-0199"
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="data.password">
                        {(field) => (
                          <field.PasswordField
                            label="Password"
                            placeholder="Enter password"
                            autoComplete="new-password"
                            data-1p-ignore
                            data-lpignore="true"
                            data-bwignore
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="data.pin">
                        {(field) => (
                          <field.PasswordField
                            label="PIN"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={12}
                            placeholder="Enter secret digit PIN"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            data-bwignore
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="data.notes">
                        {(field) => (
                          <field.TextareaField
                            label="Notes (optional)"
                            placeholder="Type any additional secure notes here."
                          />
                        )}
                      </form.AppField>
                    </div>
                  ) : (
                    <form.AppField name="data.content">
                      {(field) => (
                        <field.TextareaField
                          label="Secure Note"
                          placeholder="Type your secure note here."
                        />
                      )}
                    </form.AppField>
                  )
                }
              </form.Subscribe>
            </FieldGroup>
          </div>
          <DialogFooter className="mt-4">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Close
                </Button>
              </DialogClose>
              <form.Subscribe
                selector={(state) => [state.isSubmitting, state.canSubmit, state.values] as const}
              >
                {([isSubmitting, canSubmit, values]) => {
                  const noChange = Boolean(
                    existingItem && isEqual(values, toFormValues(existingItem)),
                  );
                  return (
                    <Field className="w-full sm:w-auto">
                      <LoadingButton
                        loading={isSubmitting}
                        disabled={!canSubmit || noChange}
                        type="submit"
                        className="w-full sm:w-auto"
                      >
                        Save
                      </LoadingButton>
                    </Field>
                  );
                }}
              </form.Subscribe>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
