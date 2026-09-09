'use client';

import { DecryptedVaultItem } from '@/types/vault-type';
import { FileText, Globe, KeyRound, Mail, Pin, PinOff, UserRound } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';

interface VaultCardProps {
  vault: DecryptedVaultItem | null;
  onView: (vault: DecryptedVaultItem) => void;
  onEdit?: (vault: DecryptedVaultItem) => void;
  onTogglePin: (vault: DecryptedVaultItem) => void;
}

export default function VaultCard({ vault, onView, onTogglePin }: VaultCardProps) {
  if (!vault) return null;

  const isAccount = vault.type === 'ACCOUNT';
  const identity = isAccount
    ? vault.data.email || vault.data.username || vault.url || 'Credential Account'
    : 'Secret Note';

  return (
    <article
      tabIndex={0}
      onClick={() => onView(vault)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView(vault);
        }
      }}
      aria-labelledby={`vault-${vault.id}-title`}
      className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all duration-150 hover:border-primary/40 hover:bg-card/95 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {isAccount ? <KeyRound className="size-4.5" /> : <FileText className="size-4.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id={`vault-${vault.id}-title`}
              className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary"
            >
              {vault.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-normal text-muted-foreground">
              {isAccount ? (
                <>
                  {vault.data.email ? (
                    <Mail className="size-3 shrink-0 text-muted-foreground/70" />
                  ) : vault.data.username ? (
                    <UserRound className="size-3 shrink-0 text-muted-foreground/70" />
                  ) : vault.url ? (
                    <Globe className="size-3 shrink-0 text-muted-foreground/70" />
                  ) : null}
                  <span className="truncate">{identity}</span>
                </>
              ) : (
                <span>Secret Note</span>
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
          aria-label={vault.pinned ? 'Unpin item' : 'Pin item'}
          title={vault.pinned ? 'Unpin item' : 'Pin item'}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {vault.pinned ? (
            <Pin className="size-3.5 fill-primary text-primary" />
          ) : (
            <PinOff className="size-3.5 opacity-40 hover:opacity-100" />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground/80">
        <span className="tabular-nums">Updated {formatRelativeDate(vault.updatedAt)}</span>
        <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View details &rarr;
        </span>
      </div>
    </article>
  );
}
