'use client';

import { Button } from '@/components/ui/button';
import VaultForm from './vault-form';
import { FileText, LockKeyhole, Pin, Plus, Search, UserRound, UserRoundKey } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { AccountData, NoteData, DecryptedVaultItem, VaultItemType } from '@/types/vault-type';
import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import VaultCard from './vault-card';
import VaultDetail from './vault-detail';
import { useVaultKey } from '@/hooks/use-vault-key';

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
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { toast } from 'sonner';
import { toggleVaultItemPin } from './action';

type FilterType = VaultItemType | 'ALL';
type ItemDialogState =
  | { mode: 'closed' }
  | { mode: 'view'; item: DecryptedVaultItem }
  | { mode: 'create' }
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

  const [optimisticItems, setOptimisticPin] = useOptimistic(
    decryptedItems ?? [],
    (state, { id, pinned }: { id: string; pinned: boolean }) =>
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

  /** TODO: HANDLE TOGGLE PIN */
  function handleTogglePin(item: DecryptedVaultItem) {
    const newPinned = !item.pinned;

    startTransition(async () => {
      setOptimisticPin({ id: item.id, pinned: newPinned });

      try {
        await toggleVaultItemPin(item.id, newPinned);
        setDecryptedItems((prev) =>
          prev ? prev.map((i) => (i.id === item.id ? { ...i, pinned: newPinned } : i)) : prev,
        );
      } catch {
        toast.error(newPinned ? 'Gagal menyematkan item' : 'Gagal melepas pin');
      }
    });
  }

  const filterOptions: { lebel: string; value: FilterType }[] = [
    { lebel: 'All', value: 'ALL' },
    { lebel: 'Account', value: 'ACCOUNT' },
    { lebel: 'Note', value: 'NOTE' },
  ];

  const typeIcons = {
    ACCOUNT: UserRound,
    NOTE: FileText,
  };

  if (!isUnlocked) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockKeyhole />
          </EmptyMedia>
          <EmptyTitle>Vault Locked</EmptyTitle>
          <EmptyDescription>
            Unlock your vault to securely access your saved passwords, notes, and other sensitive
            information.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          {session && <UnlockVault user={session} />}
          {!session.encryptedVaultKey && !session.encryptedVaultKeyIv && (
            <Button variant="outline" onClick={() => router.push('/setup-vault')}>
              Create master password
            </Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-foreground">My Vault</h1>
        <p className="mt-2 text-muted-foreground">{initialVaults.length} items stored securely</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
        {/* search */}
        <div className="order-1">
          <InputGroup className="w-full md:max-w-xs">
            <InputGroupInput
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end" className="text-xs">
              12 results
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* add vault form */}
        <div className="order-2 md:row-span-2">
          <ButtonGroup onClick={() => setDialogState({ mode: 'create' })}>
            <Button>Add New Vault</Button>
            <ButtonGroupSeparator />
            <Button size="icon">
              <Plus />
            </Button>
          </ButtonGroup>
        </div>

        {/* filter tab */}
        <div className="order-3 flex gap-2">
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              variant={filter === opt.value ? 'default' : 'secondary'}
            >
              {opt.lebel}
            </Button>
          ))}
        </div>
      </div>

      {pinnedItems.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-1">
            <Pin size={16} className="-rotate-45" />
            <span className="inline-block">Pinned</span>
          </div>
          <div className="mb-8 grid gap-4 md:grid-cols-2">
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
        <section>
          <span className="mb-2 inline-block">Others</span>
          <div className="mb-8 grid gap-4 md:grid-cols-2">
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
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <UserRoundKey className="mb-2 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No items in your vault yet</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Create your first secure item to get started
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
        open={dialogState.mode === 'create' || dialogState.mode === 'edit'}
        existingItem={dialogState.mode === 'edit' ? dialogState.item : undefined}
        itemId={dialogState.mode === 'edit' ? dialogState.item.id : undefined}
        onOpenChange={(open) => !open && setDialogState({ mode: 'closed' })}
      />
    </>
  );
}
