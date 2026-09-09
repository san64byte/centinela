import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Goodbye',
  description: 'Your account has been deleted.',
  robots: { index: false, follow: false },
};

export default async function GoodbyePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('goodbye_token');

  if (!token) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="border-border/80 shadow-md">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-2xs">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle as="h1" className="text-2xl font-bold tracking-tight text-foreground">
              Account Deleted
            </CardTitle>
            <CardDescription className="text-sm text-balance">
              Your Centinela account and all associated encrypted vault data have been permanently
              deleted. We&apos;re sorry to see you go.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Link href="/register" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
              Create a New Account
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
