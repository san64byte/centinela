import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Email Address Updated',
  description: 'Your account email address has been successfully updated.',
  robots: { index: false, follow: false },
};

export default async function EmailChangedPage() {
  const cookieStore = await cookies();
  const newEmail = cookieStore.get('email_changed_token')?.value;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="border-border/80 shadow-md">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 shadow-2xs dark:text-green-400">
              <CheckCircle2 className="size-6" />
            </div>
            <CardTitle as="h1" className="text-2xl font-bold tracking-tight text-foreground">
              Email Address Updated!
            </CardTitle>
            <CardDescription className="text-sm text-balance">
              {newEmail ? (
                <>
                  Your Centinela account email address has been successfully updated to{' '}
                  <strong className="text-foreground">{newEmail}</strong>.
                </>
              ) : (
                'Your Centinela account email address has been successfully updated.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              For your security, all existing login sessions across all devices have been signed
              out. Please sign in using your new email address.
            </p>
            <Link href="/login" className={cn(buttonVariants({ variant: 'default' }), 'w-full')}>
              Sign in with New Email
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
