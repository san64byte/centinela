'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import Link from 'next/link';
import { Loader2, LogOut, Settings, UserRound, Vault } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth';
import { useVaultKey } from '@/features/vault/hooks/use-vault-key';
import { useSignOutState } from '@/features/auth/hooks/use-signout';

export default function UserDropdown({ user }: { user: User }) {
  const { lock } = useVaultKey();
  const router = useRouter();

  const isSignOut = useSignOutState((s) => s.isSignOut);
  const setSignOut = useSignOutState((s) => s.setSignOut);

  async function handleLogout() {
    setSignOut(true);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast('Signed out successfully');
          lock();
          router.push('/login');
        },
        onError: (ctx) => {
          setSignOut(false);
          toast(ctx.error.message || 'Something went wrong');
        },
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" disabled={isSignOut}>
          <UserRound className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="mb-1.5">
            <div className="flex flex-col gap-1">
              <span className="truncate text-xs leading-none font-semibold">{user.name}</span>
              <span className="truncate text-[11px] leading-none text-muted-foreground">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/vault">
              <Vault />
              Vault
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            {isSignOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
