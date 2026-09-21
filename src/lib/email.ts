import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || 're_mock_api_key');
  }
  return _resend;
}

interface SendEmailValue {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailValue) {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Centinela <noreply@centinela.my.id>',
    to,
    subject,
    text,
    html,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }

  return data;
}
