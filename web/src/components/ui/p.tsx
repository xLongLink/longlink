import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders a paragraph with standard spacing. */
export function P({ className, ...props }: React.ComponentProps<'p'>) {
    return <p data-slot="paragraph" className={cn('leading-7', className)} {...props} />;
}
