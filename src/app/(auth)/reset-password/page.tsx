import { Metadata } from 'next';
import ResetPasswordForm from '@/components/auth/reset-password-form';
import CenteredFormLayout from '@/components/wrapped-form';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Enter your new password below.',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <CenteredFormLayout title="Reset Password" description="Enter your new password below.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-red-600">
          {error === 'INVALID_TOKEN'
            ? 'The password reset link has expired or is invalid. Please request a new one.'
            : 'Token not found.'}
        </p>
      )}
    </CenteredFormLayout>
  );
}
