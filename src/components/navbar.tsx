import { cn } from '@/lib/utils';
import WrapperContent from './wrapper-content';
import { getServerSession } from '@/lib/get-session';
import UserDropdown from './user-dropdown';
import Image from 'next/image';

import Link from 'next/link';

export default async function Navbar() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) return null;

  return (
    <header
      className={cn(
        'sticky top-0 right-0 left-0 z-50 w-full border-b border-border/10 bg-background/30 backdrop-blur-sm',
      )}
    >
      <nav aria-label="Main Navigation">
        <WrapperContent className="flex justify-between gap-6 py-3">
          <Link
            href="/vault"
            className="flex items-center gap-1 transition-opacity hover:opacity-85"
          >
            <Image
              className="h-6 w-6 shrink-0"
              src="/centinela.svg"
              width={100}
              height={100}
              alt="Logo centinela"
            />
            <span className="text-lg text-foreground">Centinela</span>
          </Link>

          <UserDropdown user={user} />
        </WrapperContent>
      </nav>
    </header>
  );
}
