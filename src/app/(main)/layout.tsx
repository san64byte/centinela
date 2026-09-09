import Navbar from '@/components/navbar';
import WrapperContent from '@/components/wrapper-content';
import { VaultKeyProvider } from '@/hooks/use-vault-key';
import React from 'react';

export default async function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <VaultKeyProvider>
      <div className="relative flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <WrapperContent className="my-12">{children}</WrapperContent>
        </main>
      </div>
    </VaultKeyProvider>
  );
}
