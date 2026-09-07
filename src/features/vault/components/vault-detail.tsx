'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';
import { DecryptedVaultItem } from '../types/vault-type';
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!vault || !open) return null;

  const typeIcons = {
    ACCOUNT: UserRound,
    NOTE: FileText,
  };

  const Icon = typeIcons[vault.type];

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  interface RenderFieldOptions {
    fieldName?: string;
    isSecret?: boolean;
    isUrl?: boolean;
  }

  const renderField = (
    label: string,
    value: string | undefined | null,
    options: RenderFieldOptions = {},
  ) => {
    if (!value) return null;
    const { fieldName = label.toLowerCase(), isSecret = false, isUrl = false } = options;

    const formattedUrl = isUrl
      ? value.startsWith('http://') || value.startsWith('https://')
        ? value
        : `https://${value}`
      : value;

    return (
      <Field>
        <Label className="text-muted-foreground">{label}</Label>
        <div className="flex items-center justify-between gap-1 rounded-[min(var(--radius-md),10px)] bg-muted/50 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            {isSecret && !showPassword ? (
              <span>********</span>
            ) : isUrl ? (
              <a
                href={formattedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate font-medium text-primary hover:underline"
              >
                {value}
              </a>
            ) : (
              <span className="font-mono text-sm font-medium break-all text-primary">{value}</span>
            )}
          </div>

          {isSecret && (
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          )}

          {isUrl ? (
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              asChild
              title="Open link in new tab"
            >
              <a href={formattedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              onClick={() => handleCopy(value, fieldName)}
              disabled={copiedField === fieldName}
              title={copiedField === fieldName ? 'Copied' : `Copy ${label}`}
            >
              {copiedField === fieldName ? (
                <CircleCheckBig className="text-green-800 dark:text-green-500" />
              ) : (
                <Copy />
              )}
            </Button>
          )}
        </div>
      </Field>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex border-b pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>

            <div>
              <DialogTitle className="text-xl font-bold">{vault.title}</DialogTitle>
              <DialogDescription>
                {vault.type === 'ACCOUNT' ? 'Credential Account' : 'Secret Note'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
          <div className="flex flex-col">
            <div className="space-y-4">
              {renderField('URL', vault.url, { isUrl: true })}

              {vault.type === 'ACCOUNT' && (
                <>
                  {renderField('Email', vault.data.email, { fieldName: 'email' })}
                  {renderField('Username', vault.data.username, { fieldName: 'username' })}
                  {renderField('Password', vault.data.password, {
                    fieldName: 'password',
                    isSecret: true,
                  })}
                  {renderField('Nomor Telepon', vault.data.phone, { fieldName: 'phone' })}
                  {renderField('PIN', vault.data.pin, { fieldName: 'pin', isSecret: true })}
                  {vault.data.notes && (
                    <Field>
                      <Label className="text-muted-foreground">Notes</Label>
                      <Alert className="w-full border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                        <AlertDescription>{vault.data.notes}</AlertDescription>
                      </Alert>
                    </Field>
                  )}
                  {vault.data.credentialHistory && vault.data.credentialHistory.length > 0 && (
                    <Field>
                      <Label className="text-muted-foreground">Credential History</Label>
                      <div className="space-y-4">
                        {vault.data.credentialHistory
                          .sort(
                            (a, b) =>
                              new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
                          )
                          .map((entry, i) => (
                            <div
                              key={i}
                              className="flex flex-col gap-1 rounded-[min(var(--radius-md),10px)] bg-muted/50 px-2.5 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{entry.type}</span>
                                <span className="text-muted-foreground">
                                  {formatDate(entry.changedAt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-accent-foreground">
                                  {showPassword ? entry.value : '********'}
                                </span>
                                <Button
                                  size="icon-xs"
                                  variant="outline"
                                  onClick={() => handleCopy(entry.value, `history-${i}`)}
                                  disabled={copiedField === `history-${i}`}
                                >
                                  {copiedField === `history-${i}` ? (
                                    <CircleCheckBig className="text-green-800 dark:text-green-500" />
                                  ) : (
                                    <Copy />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </Field>
                  )}
                </>
              )}

              {vault.type === 'NOTE' && vault.data.content && (
                <Field>
                  <Label>Content</Label>
                  <div className="flex items-center justify-between gap-2 rounded-[min(var(--radius-md),10px)] bg-muted/50 p-4 whitespace-pre-wrap">
                    {vault.data.content}
                  </div>
                </Field>
              )}

              <Separator />

              <div className="flex gap-4">
                <div className="w-full space-y-2 rounded-[min(var(--radius-md),10px)] bg-muted/50 px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-semibold">Created At</span>
                  </div>
                  <span className="text-xs font-medium text-accent-foreground">
                    {formatDate(vault.createdAt)}
                  </span>
                </div>
                <div className="w-full space-y-2 rounded-[min(var(--radius-md),10px)] bg-muted/50 px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-semibold">Updated At</span>
                  </div>
                  <span className="text-xs font-medium text-accent-foreground">
                    {formatDate(vault.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full flex-col justify-between gap-3 sm:flex-row">
            <DeleteVault id={vault.id} onSuccess={() => onOpenChange(false)} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <Button onClick={() => onEdit(vault)}>
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
