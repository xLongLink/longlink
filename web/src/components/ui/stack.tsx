import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders children in a vertical stack. */
export function Stack({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="stack" className={cn('flex flex-col gap-4', className)} {...props} />;
}
