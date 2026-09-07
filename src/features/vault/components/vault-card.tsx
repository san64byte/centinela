'use client';

import { DecryptedVaultItem } from '../types/vault-type';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { FileText, Globe, LucideProps, Pin, PinOff, UserRound } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';

interface VaultCardProps {
  vault: DecryptedVaultItem | null;
  Icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
  onView: (vault: DecryptedVaultItem) => void;
  onEdit: (vault: DecryptedVaultItem) => void;
  onTogglePin: (vault: DecryptedVaultItem) => void;
}

export default function VaultCard({ vault, onView, onTogglePin }: VaultCardProps) {
  if (!vault) return null;

  return (
    <div
      onClick={() => onView(vault)}
      className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {vault.type === 'ACCOUNT' ? (
              <UserRound className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
              {vault.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              {vault.type === 'ACCOUNT' && vault.url ? (
                <>
                  <Globe className="size-3 shrink-0" />
                  <span className="truncate">{vault.url}</span>
                </>
              ) : (
                <span>{vault.type === 'ACCOUNT' ? 'Credential Account' : 'Secret Note'}</span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(vault);
          }}
          title={vault.pinned ? 'Lepas sematan' : 'Sematkan item'}
          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {vault.pinned ? (
            <Pin className="size-4 fill-primary text-primary" />
          ) : (
            <PinOff className="size-4 opacity-40 hover:opacity-100" />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
        <span>Updated {formatRelativeDate(vault.updatedAt)}</span>
        <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          See detail &rarr;
        </span>
      </div>
    </div>
  );
}
