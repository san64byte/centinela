import { ShieldCheck, UserRound, UserRoundCog } from 'lucide-react';
import { getServerSession } from '@/lib/get-session';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BasicInformationForm from '@/components/settings/basic-information';
import EmailForm from '@/components/settings/email-form';
import PasswordForm from '@/components/settings/password-form';
import MasterPasswordForm from '@/components/settings/master-password-form';
import DeleteAccount from '@/components/settings/delete-account';
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
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          <UserRoundCog className="size-5" />
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile, credentials, and master security settings.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-fit">
          <TabsTrigger value="general">
            <UserRound className="size-4" /> General
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="size-4" /> Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="mt-4 space-y-10">
            <BasicInformationForm user={user} />
            <EmailForm currentEmail={user.email} />
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="mt-4 space-y-10">
            <PasswordForm />
            {isHaveMasterPassword && <MasterPasswordForm user={user} />}
            <DeleteAccount />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
