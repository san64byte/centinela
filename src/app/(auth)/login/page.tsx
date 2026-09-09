import LoginForm from '@/components/auth/login-form';
import { Metadata } from 'next';
import CenteredFormLayout from '@/components/wrapped-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Your secure vault is waiting. Log in to continue.',
};

export default function LoginPage() {
  return (
    <CenteredFormLayout
      title="Welcome Back"
      description="Your secure vault is waiting. Log in to continue."
    >
      <LoginForm />
    </CenteredFormLayout>
  );
}
