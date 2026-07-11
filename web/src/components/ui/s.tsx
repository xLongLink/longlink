import * as React from 'react';
import { cn } from '@/lib/utils';

/** Renders strikethrough text. */
export function S({ className, ...props }: React.ComponentProps<'s'>) {
    return <s data-slot="strikethrough" className={cn('line-through', className)} {...props} />;
}
