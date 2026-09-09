import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { SignOutOverlay } from '@/components/signout-overlay';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-sans',
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen font-sans antialiased',
          geistMono.variable,
          '[--font-mono:var(--font-sans)]',
          '[--font-serif:var(--font-sans)]',
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SignOutOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
