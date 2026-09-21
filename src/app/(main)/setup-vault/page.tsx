import CenteredFormLayout from '@/components/wrapped-form';
import SetupVaultForm from '@/components/vault/setup-vault-form';
import { getServerSession } from '@/lib/get-session';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Your Vault',
  description: 'Set a strong master password to secure your data.',
  robots: { index: false, follow: false },
};

export default async function SetupUnlockPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) redirect('/login');

  if (!user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  }

  const isHaveVault = user.encryptedVaultKey !== null && user.encryptedVaultKeyIv !== null;

  if (isHaveVault) redirect('/vault');

  return (
    <div className="flex justify-center">
      <CenteredFormLayout
        title="Create Your Vault"
        description="Set a strong master password to secure your data"
      >
        <SetupVaultForm user={user} />
      </CenteredFormLayout>
    </div>
  );
}
