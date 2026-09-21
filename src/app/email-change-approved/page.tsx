import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MailCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Email Change Approved',
  description: 'Your email change request has been approved.',
  robots: { index: false, follow: false },
};

export default function EmailChangeApprovedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card className="border-border/80 shadow-md">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
              <MailCheck className="size-6" />
            </div>
            <CardTitle as="h1" className="text-2xl font-bold tracking-tight text-foreground">
              Step 1 Complete: Request Approved
            </CardTitle>
            <CardDescription className="text-sm text-balance">
              You have successfully approved the request to change your email address. We have sent
              a final activation link to your <strong>new email address</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Please check your new email&apos;s inbox and click the activation link to finalize and
              activate the change on your Centinela account.
            </p>
            <Link href="/settings" className={cn(buttonVariants({ variant: 'default' }), 'w-full')}>
              Return to Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
