import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders underlined text. */
export function U({ className, ...props }: React.ComponentProps<'u'>) {
    return <u data-slot="underline" className={cn('underline underline-offset-4', className)} {...props} />;
}
