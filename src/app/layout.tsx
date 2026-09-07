import type { Metadata } from 'next';
import { Architects_Daughter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { SignOutOverlay } from '@/components/signout-overlay';
import { cn } from '@/lib/utils';

const fontSans = Architects_Daughter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400'],
});

export const metadata: Metadata = {
  title: {
    default: 'Centinela App',
    template: '%s | Centinela',
  },
  description: 'A secure place to store your sensitive data',
  icons: {
    icon: '/centinela.svg',
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={cn('antialiased', fontSans.variable)} suppressHydrationWarning>
        {children}
        <Toaster
          toastOptions={{
            classNames: {
              toast: 'font-sans',
            },
          }}
        />
        <SignOutOverlay />
      </body>
    </html>
  );
}
