import { cn } from '@/lib/utils';
import React from 'react';

export default function WrapperContent({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-5xl px-4', className)} {...props}>
      {children}
    </div>
  );
}
