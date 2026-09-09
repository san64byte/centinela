import prisma from '@/lib/prisma';
import { MailOpen } from 'lucide-react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Check your inbox to verify your email address.',
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect('/');

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) redirect('/');
  if (user.emailVerified) redirect('/vault');

  return (
    <div className="w-full max-w-md">
      <Card className="border-border/80 shadow-md">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
            <MailOpen className="size-6" />
          </div>
          <CardTitle as="h1" className="text-2xl font-bold tracking-tight text-foreground">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-sm text-balance">
            We&apos;ve sent a verification link to{' '}
            <strong className="text-foreground">{email}</strong>. Please check your inbox (and spam
            folder) to verify your account before signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Link href="/login" className={cn(buttonVariants({ variant: 'default' }), 'w-full')}>
            Back to Login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
