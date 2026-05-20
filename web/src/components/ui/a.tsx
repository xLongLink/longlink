import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders a styled anchor link. */
export function A({ className, ...props }: React.ComponentProps<'a'>) {
    return (
        <a
            data-slot="anchor"
            className={cn(
                'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80',
                className
            )}
            {...props}
        />
    );
}
