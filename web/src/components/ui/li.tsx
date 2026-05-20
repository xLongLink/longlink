import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders a list item. */
export function Li({ className, ...props }: React.ComponentProps<'li'>) {
    return <li data-slot="list-item" className={cn(className)} {...props} />;
}
