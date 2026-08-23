import Image from 'next/image';
import React from 'react';

type CenteredFormLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function CenteredFormLayout({
  title,
  description,
  children,
}: CenteredFormLayoutProps) {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center justify-center rounded-md">
          <Image
            className="size-10"
            src="/centinela.svg"
            width={100}
            height={100}
            alt="Logo centinela"
          />
          {/* <UserRoundKey className="size-6" /> */}
        </div>
        <div className="mb-4 flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-balance text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
