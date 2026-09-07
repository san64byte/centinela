import VaultClient from '@/features/vault/components/vault-client';
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

  const vaultItems = await prisma.vaultItem.findMany({ where: { userId: session.user.id } });

  return <VaultClient initialVaults={vaultItems} session={user} />;
}
