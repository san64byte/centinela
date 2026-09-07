'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import VaultForm from './vault-form';
import {
  ChevronDown,
  FileText,
  KeyRound,
  LockKeyhole,
  Pin,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { AccountData, NoteData, DecryptedVaultItem, VaultItemType } from '../types/vault-type';
import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import VaultCard from './vault-card';
import VaultDetail from './vault-detail';
import { useVaultKey } from '../hooks/use-vault-key';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useRouter } from 'next/navigation';
import UnlockVault from './unlock-vault';
import { VaultItem as VaultItemRecord } from '@/lib/generated/prisma/client';
import { decryptData } from '@/lib/crypto/encryption';
import { User } from '@/lib/auth';
import { toast } from 'sonner';
import { toggleVaultItemPin } from '../actions/vault.action';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FilterType = VaultItemType | 'ALL';
type ItemDialogState =
  | { mode: 'closed' }
  | { mode: 'view'; item: DecryptedVaultItem }
  | { mode: 'create'; type: VaultItemType }
  | { mode: 'edit'; item: DecryptedVaultItem };

export default function VaultClient({
  initialVaults,
  session,
}: {
  initialVaults: VaultItemRecord[];
  session: User;
}) {
  const { isUnlocked, vaultKey } = useVaultKey();

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [decryptedItems, setDecryptedItems] = useState<DecryptedVaultItem[] | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const [dialogState, setDialogState] = useState<ItemDialogState>({ mode: 'closed' });

  useEffect(() => {
    if (!isUnlocked || !vaultKey) {
      startTransition(() => setDecryptedItems(null));
      return;
    }

    let cancelled = false;

    Promise.all(
      initialVaults.map(async (item) => {
        const data: AccountData | NoteData = await decryptData(
          { ciphertext: item.ciphertext, iv: item.iv },
          vaultKey,
        );
        return { ...item, data } as unknown as DecryptedVaultItem;
      }),
    ).then((result) => {
      if (!cancelled) setDecryptedItems(result);
    });

    return () => {
      cancelled = true;
    };
  }, [isUnlocked, vaultKey, initialVaults]);

  const [optimisticItems, setOptimisticPin] = useOptimistic<
    DecryptedVaultItem[],
    { id: string; pinned: boolean }
  >(decryptedItems ?? [], (state, { id, pinned }) =>
    state.map((item) => (item.id === id ? { ...item, pinned } : { ...item })),
  );

  const { pinnedItems, otherItems, isEmpty } = useMemo(() => {
    const query = search.trim().toLowerCase();

    const bySearch = query
      ? optimisticItems.filter((item) => {
          const inTitle = item.title.toLowerCase().includes(query);
          const inSubTitle =
            item.type === 'ACCOUNT' &&
            (item.data.email?.toLowerCase().includes(query) ||
              item.data.username?.toLowerCase().includes(query));
          return inTitle || inSubTitle;
        })
      : optimisticItems;

    const filtered = filter === 'ALL' ? bySearch : bySearch.filter((item) => item.type === filter);

    return {
      pinnedItems: filtered
        .filter((item) => item.pinned)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      otherItems: filtered
        .filter((item) => !item.pinned)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      isEmpty: filtered.length === 0,
    };
  }, [search, optimisticItems, filter]);

  /** HANDLE TOGGLE PIN */
  function handleTogglePin(item: DecryptedVaultItem) {
    const newPinned = !item.pinned;

    startTransition(async () => {
      setOptimisticPin({ id: item.id, pinned: newPinned });

      try {
        const res = await toggleVaultItemPin(item.id, newPinned);
        if (!res.success) {
          toast.error(res.error || (newPinned ? 'Gagal menyematkan item' : 'Gagal melepas pin'));
          return;
        }
        setDecryptedItems((prev) =>
          prev ? prev.map((i) => (i.id === item.id ? { ...i, pinned: newPinned } : i)) : prev,
        );
      } catch {
        toast.error(newPinned ? 'Gagal menyematkan item' : 'Gagal melepas pin');
      }
    });
  }

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Account', value: 'ACCOUNT' },
    { label: 'Note', value: 'NOTE' },
  ];

  const typeIcons = {
    ACCOUNT: UserRound,
    NOTE: FileText,
  };

  if (!isUnlocked) {
    if (!session.encryptedVaultKey && !session.encryptedVaultKeyIv) {
      return (
        <div className="space-y-2 rounded-2xl border border-dashed border-border/60 text-center">
          <Empty className="w-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LockKeyhole />
              </EmptyMedia>
              <EmptyTitle className="text-xl font-semibold">Setup Master Password</EmptyTitle>
              <EmptyDescription>
                You haven&apos;t set up a Master Password yet. Your Master Password is required to
                generate the vault key (<em>vaultKey</em>), which encrypts all your credentials and
                notes locally in your browser.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.push('/setup-vault')}>
                <KeyRound className="size-4" />
                <span>Create master password</span>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      );
    } else {
      return (
        <div className="space-y-2 rounded-2xl border border-dashed border-border/60 text-center">
          <Empty className="w-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LockKeyhole />
              </EmptyMedia>
              <EmptyTitle className="text-xl font-semibold">Vault Locked</EmptyTitle>
              <EmptyDescription>
                Unlock your vault to securely access your saved passwords, notes, and other
                sensitive information.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <UnlockVault user={session} />
            </EmptyContent>
          </Empty>
        </div>
      );
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-tight">My Vault</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isUnlocked
            ? `${optimisticItems.length} items saved with zero-knowledge protection.`
            : 'Vault is encrypted and protected.'}
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* search */}
        <InputGroup className="w-full max-w-md border-border">
          <InputGroupInput
            placeholder="Search vaults..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          {search.trim() && (
            <InputGroupAddon align="inline-end" className="text-xs">
              {pinnedItems.length + otherItems.length} results
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="flex items-center gap-2">
          {/* filter tab */}
          <div
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'bg-muted/30 p-0.5 font-medium hover:bg-muted/30',
            )}
          >
            {filterOptions.map((opt) => {
              const itemCount =
                opt.value === 'ALL'
                  ? optimisticItems.length
                  : optimisticItems.filter((i) => i.type === opt.value).length;

              return (
                <Button
                  key={opt.value}
                  size="xs"
                  onClick={() => setFilter(opt.value)}
                  variant={filter === opt.value ? 'secondary' : 'ghost'}
                  className={cn('rounded-md transition-all', { 'font-bold': filter === opt.value })}
                >
                  {opt.label} ({itemCount})
                </Button>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="size-4" />
                <span>Add</span>
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setDialogState({ mode: 'create', type: 'ACCOUNT' });
                }}
              >
                <UserRound className="mr-2 size-4" />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setDialogState({ mode: 'create', type: 'NOTE' });
                }}
              >
                <FileText className="mr-2 size-4" />
                <span>Note</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {pinnedItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Pin className="size-3.5 fill-current text-primary" />
            <span>Pinned ({pinnedItems.length})</span>
          </div>
          <div className="mb-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedItems.map((vault) => {
              const Icon = typeIcons[vault.type];

              return (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  Icon={Icon}
                  onView={(item) => setDialogState({ mode: 'view', item })}
                  onEdit={(item) => setDialogState({ mode: 'edit', item })}
                  onTogglePin={handleTogglePin}
                />
              );
            })}
          </div>
        </section>
      )}

      {otherItems.length > 0 && (
        <section className="space-y-3">
          {pinnedItems.length > 0 && (
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Others ({otherItems.length})
            </div>
          )}
          <div className="mb-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {otherItems.map((vault) => {
              const Icon = typeIcons[vault.type];

              return (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  Icon={Icon}
                  onView={(item) => setDialogState({ mode: 'view', item })}
                  onEdit={(item) => setDialogState({ mode: 'edit', item })}
                  onTogglePin={handleTogglePin}
                />
              );
            })}
          </div>
        </section>
      )}

      {isEmpty && (
        <div className="space-y-2 rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
            <Search className="size-6" />
          </div>
          <h3 className="text-base font-semibold">No Items Found</h3>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            {search
              ? `No items match the search "${search}".`
              : 'No items saved in this category yet. Start by clicking the Add button.'}
          </p>
        </div>
      )}

      <VaultDetail
        open={dialogState.mode === 'view'}
        vault={dialogState.mode === 'view' ? dialogState.item : null}
        onOpenChange={(open) => !open && setDialogState({ mode: 'closed' })}
        onEdit={(item) => setDialogState({ mode: 'edit', item })}
      />

      <VaultForm
        key={dialogState.mode === 'edit' ? `edit-${dialogState.item.id}` : 'create'}
        type={
          dialogState.mode === 'create'
            ? dialogState.type
            : dialogState.mode === 'edit'
              ? dialogState.item.type
              : 'ACCOUNT'
        }
        open={dialogState.mode === 'create' || dialogState.mode === 'edit'}
        existingItem={dialogState.mode === 'edit' ? dialogState.item : null}
        onOpenChange={(open) => !open && setDialogState({ mode: 'closed' })}
      />
    </>
  );
}
