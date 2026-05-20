import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders superscript text. */
export function Sup({ className, ...props }: React.ComponentProps<'sup'>) {
    return <sup data-slot="superscript" className={cn('text-[0.8em]', className)} {...props} />;
}
