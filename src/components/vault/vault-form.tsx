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
import { Checkbox } from '@/components/ui/checkbox';
import { CredentialHistoryEntry, DecryptedVaultItem, VaultItemFormInput } from '@/types/vault-type';
import { vaultItemFormSchema } from '@/schemas/vault-schema';
import { useEffect, useState } from 'react';
import { useAppForm } from '@/lib/form';
import { encryptData } from '@/lib/crypto/encryption';
import { useVaultKey } from '@/hooks/use-vault-key';
import { createEncryptedVaultItem, updateEncryptedVaultItem } from '@/actions/vault.action';
import isEqual from 'lodash.isequal';
import { toast } from 'sonner';
import { VaultItemType } from '@/lib/generated/prisma/enums';
import { Eye, EyeOff, FileText, History, Trash2, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

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

  const [historyList, setHistoryList] = useState<CredentialHistoryEntry[]>(() =>
    isEditMode && existingItem?.type === 'ACCOUNT'
      ? (existingItem.data.credentialHistory ?? [])
      : [],
  );
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [revealedHistory, setRevealedHistory] = useState<Record<number, boolean>>({});

  const originalHistory =
    existingItem?.type === 'ACCOUNT' ? (existingItem.data.credentialHistory ?? []) : [];
  const isHistoryChanged = !isEqual(historyList, originalHistory);

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
        if (isEqual(parsed, originalValues) && !isHistoryChanged) {
          toast.info('No changes to save');
          onOpenChange(false);
          return;
        }
      }

      try {
        const { data, ...others } = value;

        // Preserve and track credential history when editing account
        let dataToEncrypt = data;
        if (isEditMode && existingItem?.type === 'ACCOUNT' && value.type === 'ACCOUNT') {
          let history = [...historyList];
          const oldPwd = existingItem.data.password;
          const newPwd = value.data.password;
          const oldPin = existingItem.data.pin;
          const newPin = value.data.pin;

          if (saveToHistory) {
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
          }

          if (history.length > 10) {
            history = history.slice(0, 10);
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

  const [prevExistingItem, setPrevExistingItem] = useState(existingItem);
  if (existingItem !== prevExistingItem) {
    setPrevExistingItem(existingItem);
    setHistoryList(
      existingItem?.type === 'ACCOUNT' ? (existingItem.data.credentialHistory ?? []) : [],
    );
    setSaveToHistory(true);
    setRevealedHistory({});
  }

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
                        Provide at least one identifier (email, username/ID, or phone). Password/PIN
                        is optional.
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
                            label="Username / ID"
                            placeholder="e.g. alex_smith or member ID"
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

                      {isEditMode && existingItem?.type === 'ACCOUNT' && (
                        <div className="space-y-3 pt-1">
                          <form.Subscribe
                            selector={(state) => ({
                              pwd:
                                state.values.type === 'ACCOUNT'
                                  ? state.values.data.password
                                  : undefined,
                              pin:
                                state.values.type === 'ACCOUNT' ? state.values.data.pin : undefined,
                            })}
                          >
                            {({ pwd, pin }) => {
                              const isPwdChanged = Boolean(
                                existingItem.data.password &&
                                pwd &&
                                existingItem.data.password !== pwd,
                              );
                              const isPinChanged = Boolean(
                                existingItem.data.pin && pin && existingItem.data.pin !== pin,
                              );
                              const hasCredentialChange = isPwdChanged || isPinChanged;

                              if (!hasCredentialChange) return null;

                              return (
                                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                                  <Checkbox
                                    id="saveToHistory"
                                    checked={saveToHistory}
                                    onCheckedChange={(checked) =>
                                      setSaveToHistory(Boolean(checked))
                                    }
                                  />
                                  <label
                                    htmlFor="saveToHistory"
                                    className="cursor-pointer text-xs font-normal text-muted-foreground select-none"
                                  >
                                    Save replaced credentials to history
                                  </label>
                                </div>
                              );
                            }}
                          </form.Subscribe>

                          {historyList.length > 0 && (
                            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <History className="size-3.5" />
                                  <span>Credential History ({historyList.length})</span>
                                </div>
                                {historyList.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setHistoryList([])}
                                  >
                                    Clear all
                                  </Button>
                                )}
                              </div>

                              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-0.5">
                                {historyList.map((entry, idx) => {
                                  const isRevealed = Boolean(revealedHistory[idx]);
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/80 px-2.5 py-1.5 text-xs"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                                          {entry.type}
                                        </span>
                                        <span className="truncate font-mono text-xs text-foreground">
                                          {isRevealed ? entry.value : '••••••••'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="hidden text-[10px] text-muted-foreground/70 tabular-nums sm:inline">
                                          {formatDate(entry.changedAt)}
                                        </span>
                                        <Button
                                          type="button"
                                          size="icon-xs"
                                          variant="ghost"
                                          onClick={() =>
                                            setRevealedHistory((prev) => ({
                                              ...prev,
                                              [idx]: !prev[idx],
                                            }))
                                          }
                                          className="size-6 text-muted-foreground hover:text-foreground"
                                          title={isRevealed ? 'Hide value' : 'Show value'}
                                        >
                                          {isRevealed ? (
                                            <EyeOff className="size-3" />
                                          ) : (
                                            <Eye className="size-3" />
                                          )}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="icon-xs"
                                          variant="ghost"
                                          onClick={() =>
                                            setHistoryList((prev) =>
                                              prev.filter((_, i) => i !== idx),
                                            )
                                          }
                                          className="size-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                          title="Delete history entry"
                                        >
                                          <Trash2 className="size-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

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
                  const isFormValuesUnchanged = Boolean(
                    existingItem && isEqual(values, toFormValues(existingItem)),
                  );
                  const noChange = isFormValuesUnchanged && !isHistoryChanged;

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
