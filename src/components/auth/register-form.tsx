'use client';

import LoadingButton from '@/components/loading-button';
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { cn, slugifyUsername } from '@/lib/utils';
import { registerSchema, usernameSchema } from '@/schemas/auth-schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export default function RegisterForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [error, setError] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const lastCheckedUsername = useRef<{ username: string; isAvailable: boolean } | null>(null);
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
            toast.success('Account registered successfully');
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
              placeholder="Alex Morgan"
              onChange={(e) => {
                const value = e.target.value;
                field.handleChange(value);

                if (!usernameTouched) {
                  const slug = slugifyUsername(value);
                  form.setFieldValue('username', slug);
                }
              }}
            />
          )}
        </form.AppField>

        <form.AppField
          name="username"
          asyncDebounceMs={400}
          validators={{
            onChangeAsync: async ({ value }) => {
              if (!value) return undefined;
              const result = usernameSchema.safeParse(value);
              if (!result.success) return undefined;

              if (lastCheckedUsername.current?.username === value) {
                return lastCheckedUsername.current.isAvailable
                  ? undefined
                  : 'Username is already taken';
              }

              try {
                const res = await authClient.isUsernameAvailable({ username: value });
                const isAvailable = res.data?.available !== false;
                lastCheckedUsername.current = { username: value, isAvailable };
                if (!isAvailable) {
                  return 'Username is already taken';
                }
              } catch {
                return 'Failed to check username availability';
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.TextField
              label="Username"
              variant="group"
              placeholder="e.g. alex_morgan"
              onChange={(e) => {
                setUsernameTouched(true);
                field.handleChange(e.target.value);
              }}
            />
          )}
        </form.AppField>

        <form.AppField name="email">
          {(field) => <field.TextField label="Email" type="email" placeholder="alex@example.com" />}
        </form.AppField>

        <form.AppField name="password">
          {(field) => (
            <field.PasswordField label="Password" placeholder="Create a strong password" />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
          {([isSubmitting, canSubmit]) => (
            <Field>
              <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
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
