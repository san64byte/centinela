'use client';

import LoadingButton from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { authClient } from '@/lib/auth-client';
import { useAppForm } from '@/lib/form';
import { updateProfileDetailSchema, usernameSchema } from '@/schemas/auth-schema';
import type { User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export default function BasicInformationForm({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null);
  const lastCheckedUsername = useRef<{ username: string; isAvailable: boolean } | null>(null);
  const { refetch } = authClient.useSession();
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      name: user.name,
      username: user.username,
    },
    validators: {
      onChange: updateProfileDetailSchema,
      onSubmit: updateProfileDetailSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      const parsed = updateProfileDetailSchema.parse(value);
      const originalValues = updateProfileDetailSchema.parse({
        name: user.name,
        username: user.username,
      });

      if (parsed.name === originalValues.name && parsed.username === originalValues.username) {
        toast.info('No changes to save');
        return;
      }

      await authClient.updateUser(
        {
          name: parsed.name,
          username: parsed.username,
        },
        {
          onSuccess: async () => {
            await refetch();
            router.refresh();
            toast.success('Updated successfully');
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'Something went wrong');
          },
        },
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Basic Information</CardTitle>
        <CardDescription>
          Update your name and username. Your username is visible to others and used to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {error && <FieldError>{error}</FieldError>}

            <form.AppField name="name">
              {(field) => <field.TextField label="Full Name" placeholder="e.g. John Doe" />}
            </form.AppField>

            <form.AppField
              name="username"
              asyncDebounceMs={400}
              validators={{
                onChangeAsync: async ({ value }) => {
                  if (!value || value === user.username) return undefined;
                  const result = usernameSchema.safeParse(value);
                  if (!result.success) return undefined;

                  if (
                    lastCheckedUsername.current &&
                    lastCheckedUsername.current.username === value
                  ) {
                    return lastCheckedUsername.current.isAvailable
                      ? undefined
                      : 'Username is already taken';
                  }

                  try {
                    const res = await authClient.isUsernameAvailable({ username: value });
                    if (res.error) {
                      if (res.error.status === 429) {
                        return 'Too many requests. Please wait a moment.';
                      }
                      return res.error.message || 'Failed to check username availability';
                    }
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
                <field.TextField label="Username" variant="group" placeholder="e.g. johndoe" />
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
              {([isSubmitting, canSubmit]) => (
                <Field orientation="horizontal">
                  <LoadingButton loading={isSubmitting} disabled={!canSubmit} type="submit">
                    Save changes
                  </LoadingButton>
                </Field>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
