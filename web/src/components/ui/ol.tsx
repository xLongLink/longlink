import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders an ordered list with typographic defaults. */
export function Ol({ className, ...props }: React.ComponentProps<'ol'>) {
    return <ol data-slot="ordered-list" className={cn('ml-6 list-decimal space-y-2', className)} {...props} />;
}
