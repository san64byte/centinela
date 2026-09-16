import LoginForm from '@/components/auth/login-form';
import { Metadata } from 'next';
import CenteredFormLayout from '@/components/wrapped-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Your secure vault is waiting. Log in to continue.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string }>;
}) {
  const params = await searchParams;
  const isVerified = params?.verified === 'true';

  return (
    <CenteredFormLayout
      title="Welcome Back"
      description="Your secure vault is waiting. Log in to continue."
    >
      <LoginForm isVerified={isVerified} />
    </CenteredFormLayout>
  );
}
