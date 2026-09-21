import CenteredFormLayout from '@/components/wrapped-form';
import { getServerSession } from '@/lib/get-session';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import ConfirmResetVaultForm from './confirm-reset-vault-form';

export const metadata: Metadata = {
  title: 'Confirm Reset Master Password',
  description: 'Confirm resetting your master password and erasing vault items.',
  robots: { index: false, follow: false },
};

export default async function ConfirmResetVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) redirect('/login');

  const { token } = await searchParams;

  return (
    <div className="flex justify-center py-6">
      <CenteredFormLayout
        title="Confirm Master Password Reset"
        description="Verify your request to erase vault contents and reset your master password."
      >
        <ConfirmResetVaultForm token={token} />
      </CenteredFormLayout>
    </div>
  );
}
