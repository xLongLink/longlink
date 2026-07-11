import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders subscript text. */
export function Sub({ className, ...props }: React.ComponentProps<'sub'>) {
    return <sub data-slot="subscript" className={cn('text-[0.8em]', className)} {...props} />;
}
