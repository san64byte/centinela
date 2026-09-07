import Navbar from '@/components/navbar';
import WrapperContent from '@/components/wrapper-content';
import { VaultKeyProvider } from '@/features/vault/hooks/use-vault-key';
import React from 'react';

export default async function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <VaultKeyProvider>
      <main className="relative flex min-h-screen flex-col">
        <Navbar />
        <WrapperContent className="my-12">{children}</WrapperContent>
      </main>
    </VaultKeyProvider>
  );
}
