'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import Link from 'next/link';
import { Loader2, LogOut, Moon, Settings, Sun, SunMoon, UserRound, Vault } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/auth';
import { useVaultKey } from '@/hooks/use-vault-key';
import { setSignOut, useSignOutState } from '@/hooks/use-signout';
import { useTheme } from 'next-themes';

export default function UserDropdown({ user }: { user: User }) {
  const { lock } = useVaultKey();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  const isSignOut = useSignOutState();

  async function handleLogout() {
    setSignOut(true);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success('Signed out successfully');
          lock();
          router.push('/login');
          setTimeout(() => setSignOut(false), 500);
        },
        onError: (ctx) => {
          setSignOut(false);
          toast.error(ctx.error.message || 'Something went wrong');
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
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="mb-1.5">
            <div className="flex flex-col gap-1">
              <span className="truncate text-xs leading-none font-semibold">{user.name}</span>
              <span className="truncate text-[11px] leading-none text-muted-foreground">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/vault">
              <Vault className="size-4" />
              Vault
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SunMoon className="size-4" />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="size-4" />
                Light {theme === 'light' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="size-4" />
                Dark {theme === 'dark' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <SunMoon className="size-4" />
                System {theme === 'system' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            {isSignOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
