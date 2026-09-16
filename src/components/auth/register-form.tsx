'use client';

import LoadingButton from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field';
import { useUsernameAvailability } from '@/hooks/use-username-availability';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { cn, slugifyUsername } from '@/lib/utils';
import { registerSchema } from '@/schemas/auth-schema';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import PasswordGenerator from '@/components/password-generator';

export default function RegisterForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [error, setError] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
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
            toast.success('Account registered successfully');
            try {
              localStorage.setItem(
                `verify_email_cooldown_${value.email.toLowerCase()}`,
                Date.now().toString(),
              );
            } catch {
              // Ignore storage errors if private browsing restricts localStorage
            }
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
              placeholder="e.g. alex_morgan"
            />
          )}
        </form.AppField>

        <form.AppField name="email">
          {(field) => <field.TextField label="Email" type="email" placeholder="alex@example.com" />}
        </form.AppField>

        <form.AppField name="password">
          {(field) => (
            <field.PasswordField
              label="Password"
              placeholder="Create a strong password"
              labelSlot={
                <div className="ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowGenerator((prev) => !prev)}
                    className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Sparkles className="size-3 text-primary" />
                    <span>{showGenerator ? 'Hide generator' : 'Generate password'}</span>
                  </Button>
                </div>
              }
            >
              {showGenerator && (
                <PasswordGenerator
                  onApply={(pwd: string) => {
                    field.handleChange(pwd);
                    setShowGenerator(false);
                  }}
                  onClose={() => setShowGenerator(false)}
                />
              )}
            </field.PasswordField>
          )}
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
