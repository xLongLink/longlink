import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders bold text. */
export function B({ className, ...props }: React.ComponentProps<'strong'>) {
    return <strong data-slot="bold" className={cn('font-semibold text-foreground', className)} {...props} />;
}
