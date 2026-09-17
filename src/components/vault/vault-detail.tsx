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
import { Field } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';
import { DecryptedVaultItem } from '@/types/vault-type';
import {
  Calendar,
  CircleCheckBig,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import DeleteVault from './delete-vault';

interface VaultDetailProps extends React.ComponentProps<typeof Dialog> {
  open: boolean;
  vault: DecryptedVaultItem | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (vault: DecryptedVaultItem) => void;
}

export default function VaultDetail({
  open,
  vault,
  onOpenChange,
  onEdit,
  ...props
}: VaultDetailProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [revealedHistory, setRevealedHistory] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!vault || !open) return null;

  const typeIcons = {
    ACCOUNT: UserRound,
    NOTE: FileText,
  };

  const Icon = typeIcons[vault.type];

  const handleCopy = async (text: string, fieldName: string, isSecret = false) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(isSecret ? 'Copied to clipboard (auto-clears in 45s)' : 'Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);

      if (isSecret) {
        setTimeout(async () => {
          try {
            const current = await navigator.clipboard.readText();
            if (current === text) {
              await navigator.clipboard.writeText('');
            }
          } catch {
            // Reading clipboard may fail if window is out of focus; safely ignore
          }
        }, 45000);
      }
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  interface RenderFieldOptions {
    fieldName?: string;
    isSecret?: boolean;
    isRevealed?: boolean;
    onToggleReveal?: () => void;
    isUrl?: boolean;
  }

  const renderField = (
    label: string,
    value: string | undefined | null,
    options: RenderFieldOptions = {},
  ) => {
    if (!value) return null;
    const {
      fieldName = label.toLowerCase(),
      isSecret = false,
      isRevealed = false,
      onToggleReveal,
      isUrl = false,
    } = options;

    const formattedUrl = isUrl
      ? value.startsWith('http://') || value.startsWith('https://')
        ? value
        : `https://${value}`
      : value;

    return (
      <Field className="space-y-1.5">
        <span className="block text-xs font-medium tracking-wide text-muted-foreground/90">
          {label}
        </span>
        <div className="group/field relative flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2 shadow-2xs transition-colors hover:border-border hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            {isSecret && !isRevealed ? (
              <span className="font-mono text-xs tracking-[0.28em] text-muted-foreground select-none">
                ••••••••
              </span>
            ) : isUrl ? (
              <a
                href={formattedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {value}
              </a>
            ) : (
              <span className="font-mono text-xs font-medium break-all text-foreground">
                {value}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isSecret && onToggleReveal && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onToggleReveal}
                aria-label={isRevealed ? `Hide ${label}` : `Show ${label}`}
                title={isRevealed ? `Hide ${label}` : `Show ${label}`}
                className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground"
              >
                {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            )}

            {isUrl ? (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                asChild
                aria-label="Open link in new tab"
                title="Open link in new tab"
                className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground"
              >
                <a href={formattedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => handleCopy(value, fieldName, isSecret)}
                disabled={copiedField === fieldName}
                aria-label={copiedField === fieldName ? 'Copied' : `Copy ${label}`}
                title={copiedField === fieldName ? 'Copied' : `Copy ${label}`}
                className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground disabled:opacity-100"
              >
                {copiedField === fieldName ? (
                  <CircleCheckBig className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </Field>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
              <Icon className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {vault.title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs font-normal text-muted-foreground">
                {vault.type === 'ACCOUNT' ? 'Credential Account' : 'Secret Note'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="-mx-4 max-h-[55vh] space-y-3.5 overflow-y-auto px-4 py-2">
          {renderField('URL', vault.url, { isUrl: true })}

          {vault.type === 'ACCOUNT' && (
            <>
              {renderField('Email', vault.data.email, { fieldName: 'email' })}
              {renderField('Username / ID', vault.data.username, { fieldName: 'username' })}
              {renderField('Password', vault.data.password, {
                fieldName: 'password',
                isSecret: true,
                isRevealed: showPassword,
                onToggleReveal: () => setShowPassword(!showPassword),
              })}
              {renderField('Phone Number', vault.data.phone, { fieldName: 'phone' })}
              {renderField('PIN', vault.data.pin, {
                fieldName: 'pin',
                isSecret: true,
                isRevealed: showPin,
                onToggleReveal: () => setShowPin(!showPin),
              })}

              {vault.data.notes && (
                <Field className="space-y-1.5">
                  <span className="block text-xs font-medium tracking-wide text-muted-foreground/90">
                    Notes
                  </span>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 text-xs leading-relaxed font-normal wrap-break-word whitespace-pre-wrap text-foreground shadow-2xs">
                    {vault.data.notes}
                  </div>
                </Field>
              )}

              {vault.data.credentialHistory && vault.data.credentialHistory.length > 0 && (
                <Field className="space-y-2">
                  <span className="block text-xs font-medium tracking-wide text-muted-foreground/90">
                    Password History
                  </span>
                  <div className="space-y-2">
                    {vault.data.credentialHistory
                      .sort(
                        (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
                      )
                      .map((entry, i) => {
                        const isHistoryRevealed = Boolean(revealedHistory[i]);
                        return (
                          <div
                            key={i}
                            className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs shadow-2xs transition-colors hover:bg-muted/30"
                          >
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                {entry.type}
                              </span>
                              <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                                {formatDate(entry.changedAt)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-medium break-all text-foreground">
                                {isHistoryRevealed ? entry.value : '••••••••'}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() =>
                                    setRevealedHistory((prev) => ({
                                      ...prev,
                                      [i]: !prev[i],
                                    }))
                                  }
                                  aria-label={isHistoryRevealed ? 'Hide value' : 'Show value'}
                                  title={isHistoryRevealed ? 'Hide value' : 'Show value'}
                                  className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground"
                                >
                                  {isHistoryRevealed ? (
                                    <EyeOff className="size-3.5" />
                                  ) : (
                                    <Eye className="size-3.5" />
                                  )}
                                </Button>
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() => handleCopy(entry.value, `history-${i}`, true)}
                                  disabled={copiedField === `history-${i}`}
                                  aria-label={copiedField === `history-${i}` ? 'Copied' : 'Copy'}
                                  title={copiedField === `history-${i}` ? 'Copied' : 'Copy'}
                                  className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground disabled:opacity-100"
                                >
                                  {copiedField === `history-${i}` ? (
                                    <CircleCheckBig className="size-3.5 text-success" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Field>
              )}
            </>
          )}

          {vault.type === 'NOTE' && vault.data.content && (
            <Field className="space-y-1.5">
              <span className="block text-xs font-medium tracking-wide text-muted-foreground/90">
                Content
              </span>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 font-mono text-xs leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground shadow-2xs">
                {vault.data.content}
              </div>
            </Field>
          )}

          <Separator className="my-3 opacity-60" />

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-2.5 shadow-2xs transition-colors">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5 text-muted-foreground/70" />
                <span className="text-[11px] font-medium text-muted-foreground">Created</span>
              </div>
              <span className="block font-mono text-xs font-medium text-foreground tabular-nums">
                {formatDate(vault.createdAt)}
              </span>
            </div>
            <div className="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-2.5 shadow-2xs transition-colors">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5 text-muted-foreground/70" />
                <span className="text-[11px] font-medium text-muted-foreground">Updated</span>
              </div>
              <span className="block font-mono text-xs font-medium text-foreground tabular-nums">
                {formatDate(vault.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DeleteVault
              id={vault.id}
              title={vault.title}
              onSuccess={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            />

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Close
                </Button>
              </DialogClose>
              <Button onClick={() => onEdit(vault)} className="w-full gap-1.5 sm:w-auto">
                <Edit2 className="size-4" />
                Edit
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
