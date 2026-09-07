'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { updateProfileDetailSchema } from '@/features/auth/schemas/auth-schema';
import LoadingButton from '@/components/loading-button';
import { User } from '@/lib/auth';
import { useAppForm } from '@/lib/form';
import { useUsernameAvailability } from '@/features/auth/hooks/use-username-availability';
import { useState } from 'react';
import isEqual from 'lodash.isequal';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function BasicInformationForm({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null);
  const [, setUsernameTouched] = useState(false);
  const { checking, available, checkError, checkUsername } = useUsernameAvailability({
    originalUsername: user.username!,
  });
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

      if (isEqual(parsed, originalValues)) {
        toast('No changes to save');
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
            toast('Updated successfully');
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
          <FieldGroup className="gap-2">
            {error && <FieldError>{error}</FieldError>}

            <form.AppField name="name">
              {(field) => <field.TextField label="Full Name" placeholder="e.g. John Doe" />}
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
                  placeholder="e.g. johndoe"
                />
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
              {([isSubmitting, canSubmit]) => (
                <Field orientation="horizontal">
                  <LoadingButton
                    loading={isSubmitting}
                    disabled={!canSubmit || checking}
                    type="submit"
                  >
                    Save change
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
