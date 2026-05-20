import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders inline code with monospace defaults. */
export function Code({ className, ...props }: React.ComponentProps<'code'>) {
    return (
        <code
            data-slot="code"
            className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground', className)}
            {...props}
        />
    );
}
