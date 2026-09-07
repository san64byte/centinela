'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field';
import { useUsernameAvailability } from '@/features/auth/hooks/use-username-availability';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { cn, slugifyUsername } from '@/lib/utils';
import { registerSchema } from '@/features/auth/schemas/auth-schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function RegisterForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [error, setError] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const { checking, available, checkError, checkUsername } = useUsernameAvailability();
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
    },
    validators: {
      onChange: registerSchema,
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
          username: value.username,
          password: value.password,
          callbackURL: '/vault',
        },
        {
          onSuccess: () => {
            toast('Register successfully');
            router.push(`/verify-email?email=${encodeURIComponent(value.email)}`);
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'Something went wrong');
          },
        },
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={cn('flex w-full flex-col gap-4', className)}
      {...props}
    >
      <FieldGroup>
        {error && <FieldError>{error}</FieldError>}

        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Full Name"
              placeholder="Bahlil Ganteng"
              onChange={(e) => {
                const value = e.target.value;
                field.handleChange(value);

                if (!usernameTouched) {
                  const slug = slugifyUsername(value);
                  form.setFieldValue('username', slug);
                  checkUsername(slug);
                }
              }}
            />
          )}
        </form.AppField>

        <form.AppField name="username">
          {(field) => (
            <field.TextField
              label="Username"
              variant="group"
              dataVariantGroup={{
                checking,
                available,
                checkError,
                checkUsername,
                setUsernameTouched,
              }}
              placeholder="e.g. bahlil_ganteng"
            />
          )}
        </form.AppField>

        <form.AppField name="email">
          {(field) => <field.TextField label="Email" placeholder="your@gmail.com" />}
        </form.AppField>

        <form.AppField name="password">
          {(field) => <field.PasswordField label="Password" placeholder="Password" />}
        </form.AppField>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton
                loading={isSubmitting}
                disabled={!canSubmit || available !== true}
                type="submit"
              >
                Register
              </LoadingButton>
            </Field>
          )}
        </form.Subscribe>
      </FieldGroup>
      <FieldDescription className="text-center">
        Already have an account? <Link href="/login">Login</Link>
      </FieldDescription>
    </form>
  );
}
