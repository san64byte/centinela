import { ShieldCheck, UserRound, UserRoundCog } from 'lucide-react';
import { getServerSession } from '@/lib/get-session';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BasicInformationForm from '@/features/settings/components/basic-information';
import EmailForm from '@/features/settings/components/email-form';
import PasswordForm from '@/features/settings/components/password-form';
import MasterPasswordForm from '@/features/settings/components/master-password-form';
import DeleteAccount from '@/features/settings/components/delete-account';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'Manage your account information and security settings.',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) redirect('/login');

  const isHaveMasterPassword = user.encryptedVaultKey && user.encryptedVaultKeyIv;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <UserRoundCog className="size-5" />
          Account Settings
        </div>
        <p className="text-muted-foreground">Holla! Here&apos;s your account settings.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general">
            <UserRound className="size-4" /> General
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="size-4" /> Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="mt-4 space-y-4">
            <BasicInformationForm user={user} />
            <EmailForm currentEmail={user.email} />
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="mt-4 space-y-4">
            <PasswordForm />
            {isHaveMasterPassword && <MasterPasswordForm user={user} />}
            <DeleteAccount />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
