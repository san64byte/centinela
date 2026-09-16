import prisma from '@/lib/prisma';
import { MailOpen } from 'lucide-react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as z from 'zod';
import VerifyEmailForm from '@/components/auth/verify-email-form';

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
  if (!email || !z.email().safeParse(email).success) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  if (!user) {
    redirect('/login');
  }

  if (user.emailVerified) {
    redirect('/login?verified=true');
  }

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
        <CardContent className="flex flex-col items-center gap-3">
          <VerifyEmailForm email={email} />
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            Back to Login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
