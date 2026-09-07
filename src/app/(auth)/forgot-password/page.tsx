import CenteredFormLayout from '@/components/wrapped-form';
import ForgotPasswordForm from '@/features/auth/components/forgot-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: "Enter your email address and we'll send you a link to reset your password.",
};

export default function ForgotPasswordPage() {
  return (
    <CenteredFormLayout
      title="Forgot Password"
      description="Enter your email address and we'll send you a link to reset your password."
    >
      <ForgotPasswordForm />
    </CenteredFormLayout>
  );
}
