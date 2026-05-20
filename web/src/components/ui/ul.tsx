import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders an unordered list with typographic defaults. */
export function Ul({ className, ...props }: React.ComponentProps<'ul'>) {
    return <ul data-slot="unordered-list" className={cn('ml-6 list-disc space-y-2', className)} {...props} />;
}
