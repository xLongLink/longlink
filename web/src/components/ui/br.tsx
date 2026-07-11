import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders a spacer block for visual separation. */
export function Br({ className, ...props }: React.ComponentProps<'div'>) {
    return <div aria-hidden="true" data-slot="br" className={cn('block h-4', className)} {...props} />;
}
