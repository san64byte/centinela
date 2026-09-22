import VaultClient from '@/components/vault/vault-client';
import { getServerSession } from '@/lib/get-session';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vault',
  description: 'Your encrypted vault items.',
  robots: { index: false, follow: false },
};

export default async function VaultPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) redirect('/login');

  if (!user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  }

  const vaultItems = await prisma.vaultItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  });

  return <VaultClient initialVaults={vaultItems} session={user} />;
}
