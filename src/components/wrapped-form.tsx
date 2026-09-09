import Image from 'next/image';
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
    <div className="w-full max-w-md">
      <Card className="border-border/80 shadow-md">
        <CardHeader className="flex flex-col items-center gap-2 pb-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 p-2 text-primary shadow-2xs">
            <Image
              className="size-7"
              src="/centinela.svg"
              width={100}
              height={100}
              alt="Centinela logo"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-balance text-muted-foreground">{description}</p>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
