'use client';

import { Button } from '@/components/ui/button';
import VaultForm from './vault-form';
import {
  ChevronDownIcon,
  FileText,
  KeyRound,
  LockKeyhole,
  Pin,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { AccountData, NoteData, DecryptedVaultItem, VaultItemType } from '@/types/vault-type';
import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import VaultCard from './vault-card';
import VaultDetail from './vault-detail';
import { useVaultKey } from '@/hooks/use-vault-key';
import { useRouter } from 'next/navigation';
import UnlockVault from './unlock-vault';
import { VaultItem as VaultItemRecord } from '@/lib/generated/prisma/client';
import { decryptData } from '@/lib/crypto/encryption';
import { User } from '@/lib/auth';
import { toast } from 'sonner';
import { toggleVaultItemPin } from '@/actions/vault.action';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';

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
    )
      .then((result) => {
        if (!cancelled) setDecryptedItems(result);
      })
      .catch((error) => {
        console.error('Decryption error:', error);
        if (!cancelled) {
          toast.error('Failed to decrypt some vault items');
          setDecryptedItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isUnlocked, vaultKey, initialVaults]);

  const isDecrypting =
    isUnlocked && Boolean(vaultKey) && decryptedItems === null && initialVaults.length > 0;

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
          const inContent = item.type === 'NOTE' && item.data.content.toLowerCase().includes(query);
          return inTitle || inSubTitle || inContent;
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
          toast.error(res.error || (newPinned ? 'Failed to pin item' : 'Failed to unpin item'));
          return;
        }
        toast.success(newPinned ? 'Item pinned' : 'Item unpinned');
        setDecryptedItems((prev) =>
          prev ? prev.map((i) => (i.id === item.id ? { ...i, pinned: newPinned } : i)) : prev,
        );
      } catch {
        toast.error(newPinned ? 'Failed to pin item' : 'Failed to unpin item');
      }
    });
  }

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Account', value: 'ACCOUNT' },
    { label: 'Note', value: 'NOTE' },
  ];

  if (!isUnlocked) {
    if (!session.encryptedVaultKey && !session.encryptedVaultKeyIv) {
      return (
        <div className="flex w-full justify-center py-12">
          <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LockKeyhole className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Set Up Master Password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven&apos;t set up a Master Password yet. Your Master Password generates the
              encryption key to secure all your credentials locally.
            </p>
            <Button onClick={() => router.push('/setup-vault')} className="mt-6 gap-2">
              <KeyRound className="size-4" />
              <span>Create Master Password</span>
            </Button>
          </div>
        </div>
      );
    } else {
      return <UnlockVault user={session} />;
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Vault</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isUnlocked
            ? `${optimisticItems.length} items secured with zero-knowledge encryption.`
            : 'Vault is encrypted and protected.'}
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* search */}
        <InputGroup className="h-9 w-full max-w-md rounded-lg border-border/80 bg-background/50 shadow-2xs transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <InputGroupAddon align="inline-start">
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search vaults..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-full text-xs placeholder:text-muted-foreground/70"
          />
          {search.trim() && (
            <InputGroupAddon align="inline-end" className="text-xs text-muted-foreground/80">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                {pinnedItems.length + otherItems.length}
              </span>
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="flex flex-wrap gap-2.5 sm:flex-nowrap">
          {/* filter tab */}
          <div
            role="tablist"
            aria-label="Filter vaults by type"
            className="flex h-9 w-fit items-center rounded-lg border border-border/80 bg-muted/50 p-1 shadow-2xs"
          >
            {filterOptions.map((opt) => {
              const itemCount =
                opt.value === 'ALL'
                  ? optimisticItems.length
                  : optimisticItems.filter((i) => i.type === opt.value).length;

              const isSelected = filter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all select-none',
                    isSelected
                      ? 'bg-background font-semibold text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:bg-background/40 hover:text-foreground',
                  )}
                >
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums transition-colors',
                      isSelected ? 'font-normal text-muted-foreground' : 'text-muted-foreground/70',
                    )}
                  >
                    ({itemCount})
                  </span>
                </button>
              );
            })}
          </div>

          <ButtonGroup className="shadow-2xs">
            <Button
              onClick={() => setDialogState({ mode: 'create', type: 'ACCOUNT' })}
              className="h-9 gap-1.5 px-3 text-xs font-medium"
            >
              <Plus className="size-3.5" />
              <span>Add</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-8 border-l border-primary-foreground/20 px-0 hover:bg-primary/90"
                  aria-label="More vault types"
                >
                  <ChevronDownIcon className="size-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
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
          </ButtonGroup>
        </div>
      </div>

      {pinnedItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Pin className="size-3.5 fill-current text-primary" />
            <span>Pinned</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
              {pinnedItems.length}
            </span>
          </h2>
          <div className="mb-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedItems.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                onView={(item) => setDialogState({ mode: 'view', item })}
                onEdit={(item) => setDialogState({ mode: 'edit', item })}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        </section>
      )}

      {otherItems.length > 0 && (
        <section className="space-y-3">
          {pinnedItems.length > 0 && (
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <span>Others</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                {otherItems.length}
              </span>
            </h2>
          )}
          <div className="mb-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {otherItems.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                onView={(item) => setDialogState({ mode: 'view', item })}
                onEdit={(item) => setDialogState({ mode: 'edit', item })}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        </section>
      )}

      {isDecrypting ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border/70 p-12 text-center shadow-2xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
            <LockKeyhole className="size-6 animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Decrypting Vault...
          </h3>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            Decrypting your vault credentials locally in memory.
          </p>
        </div>
      ) : (
        isEmpty && (
          <div className="space-y-2 rounded-2xl border border-dashed border-border/70 p-12 text-center shadow-2xs">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground shadow-2xs">
              <Search className="size-6" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">No Items Found</h3>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
              {search
                ? `No items match the search "${search}".`
                : 'No items saved in this category yet. Start by clicking the Add button.'}
            </p>
          </div>
        )
      )}

      <VaultDetail
        key={dialogState.mode === 'view' ? dialogState.item.id : 'detail'}
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
