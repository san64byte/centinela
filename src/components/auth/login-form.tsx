'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field';
import { useSignOutState } from '@/hooks/use-signout';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { cn } from '@/lib/utils';
import { loginSchema } from '@/schemas/auth-schema';
import { ErrorContext } from 'better-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';

function isEmail(value: string): boolean {
  return z.email().safeParse(value).success;
}

export default function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      identifier: '',
      password: '',
    },
    validators: {
      onSubmit: loginSchema,
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const { identifier, password } = value;

      const callbacks = {
        onSuccess: () => {
          toast.success('Logged in successfully');
          router.push('/vault');
        },
        onError: (ctx: ErrorContext) => {
          setError(ctx.error.message || 'Something went wrong');
        },
      };

      if (isEmail(identifier)) {
        await authClient.signIn.email(
          { email: identifier, password, rememberMe: false },
          callbacks,
        );
      } else {
        await authClient.signIn.username(
          { username: identifier, password, rememberMe: false },
          callbacks,
        );
      }
    },
  });

  useEffect(() => {
    useSignOutState.getState().setSignOut(false);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn('flex w-full flex-col gap-4', className)}
      {...props}
    >
      <FieldGroup>
        {error && <FieldError>{error}</FieldError>}

        <form.AppField name="identifier">
          {(field) => (
            <field.TextField label="Email or Username" placeholder="Enter your email/username" />
          )}
        </form.AppField>

        <form.AppField name="password">
          {(field) => (
            <field.PasswordField
              label="Password"
              placeholder="Enter your password"
              labelSlot={
                <Link
                  href="/forgot-password"
                  className="ml-auto inline-block text-xs text-accent-foreground underline"
                >
                  Forgot your password?
                </Link>
              }
            />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                Login
              </LoadingButton>
            </Field>
          )}
        </form.Subscribe>
      </FieldGroup>
      <FieldDescription className="text-center">
        Don&apos;t have an account? <Link href="/register">Register</Link>
      </FieldDescription>
    </form>
  );
}
