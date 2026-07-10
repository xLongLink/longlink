import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders a styled anchor link. */
export function A({ className, href, target, rel, ...props }: React.ComponentProps<'a'>) {
    // External documentation links should not navigate users away from the current page.
    const isExternalHttpLink = typeof href === 'string' && /^https?:\/\//.test(href);
    const resolvedTarget = target ?? (isExternalHttpLink ? '_blank' : undefined);
    const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);

    return (
        <a
            data-slot="anchor"
            href={href}
            target={resolvedTarget}
            rel={resolvedRel}
            className={cn(
                'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80',
                className
            )}
            {...props}
        />
    );
}
