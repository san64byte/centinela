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
import { DecryptedVaultItem, VaultItemFormInput } from '../types/vault-type';
import { vaultItemFormSchema } from '../schemas/vault-schema';
import { useEffect } from 'react';
import { useAppForm } from '@/lib/form';
import { encryptData } from '@/lib/crypto/encryption';
import { useVaultKey } from '../hooks/use-vault-key';
import { createEncryptedVaultItem, updateEncryptedVaultItem } from '../actions/vault.action';
import isEqual from 'lodash.isequal';
import { toast } from 'sonner';
import { VaultItemType } from '@/lib/generated/prisma/enums';
import { FileText, UserRound } from 'lucide-react';

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

  const isEditMode = Boolean(existingItem);

  const form = useAppForm({
    defaultValues: getInitialValues(existingItem, type),
    validators: {
      onChange: vaultItemFormSchema,
      onSubmit: vaultItemFormSchema,
    },
    onSubmit: async ({ value }) => {
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
        const { ciphertext, iv } = await encryptData(data, vaultKey!);

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
      } catch {
        toast.error('Something went wrong');
      }
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset(getInitialValues(existingItem, type));
  }, [open, type, existingItem]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {type === 'ACCOUNT' ? (
              <UserRound className="size-5" />
            ) : (
              <FileText className="size-5" />
            )}
          </div>
          <DialogTitle className="text-center text-xl">
            {isEditMode
              ? `Edit ${existingItem?.type === 'NOTE' ? 'Note' : 'Account'}`
              : `Add New ${type === 'NOTE' ? 'Note' : 'Account'}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            All sensitive fields will be automatically encrypted using AES-GCM in the browser before
            being saved.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4 pb-4">
            <FieldGroup>
              <div className="flex flex-col gap-3">
                <form.AppField name="title">
                  {(field) => <field.TextField label="Title" placeholder="e.g. Account Gmail" />}
                </form.AppField>

                <form.AppField name="url">
                  {(field) => (
                    <field.TextField
                      type="url"
                      label="URL"
                      placeholder="e.g. https://example.com"
                    />
                  )}
                </form.AppField>
              </div>

              {/* Dynamic Form */}
              <form.Subscribe selector={(state) => state.values.type}>
                {(type) =>
                  type === 'ACCOUNT' ? (
                    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Please provide at least one identifier (email/username/phone) and one
                        credential (password/PIN).
                      </p>

                      <div className="mb-4 flex flex-col gap-3">
                        <span className="text-base font-medium">Identifiers</span>

                        <form.AppField name="data.email">
                          {(field) => (
                            <field.TextField
                              label="Email"
                              type="email"
                              placeholder="e.g. your@gmail.com"
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
                              placeholder="e.g. bahlil_ganteng"
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
                              placeholder="e.g. +62 812-xxxx-xxxx"
                            />
                          )}
                        </form.AppField>
                      </div>

                      <div className="mb-4 flex flex-col gap-3">
                        <span className="text-base font-medium">Credentials</span>

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
                              placeholder="Enter your digit PIN"
                              autoComplete="off"
                              data-1p-ignore
                              data-lpignore="true"
                              data-bwignore
                            />
                          )}
                        </form.AppField>
                      </div>

                      <form.AppField name="data.notes">
                        {(field) => (
                          <field.TextareaField
                            label="Note (opsional)"
                            placeholder="Type your note here."
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
          <DialogFooter className="flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <form.Subscribe
              selector={(state) => [state.isSubmitting, state.canSubmit, state.values] as const}
            >
              {([isSubmitting, canSubmit, values]) => {
                const noChange = Boolean(
                  existingItem && isEqual(values, toFormValues(existingItem)),
                );
                return (
                  <Field className="sm:w-fit">
                    <LoadingButton
                      loading={isSubmitting}
                      disabled={!canSubmit || noChange}
                      type="submit"
                    >
                      Save
                    </LoadingButton>
                  </Field>
                );
              }}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
