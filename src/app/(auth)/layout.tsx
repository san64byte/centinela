import { getServerSession } from '@/lib/get-session';
import { redirect } from 'next/navigation';

export default async function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const user = session?.user;

  if (user && user.emailVerified) redirect('/vault');

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">{children}</main>
  );
}
