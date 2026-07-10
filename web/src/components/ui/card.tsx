import * as React from 'react';

import { cn } from '@/lib/utils';

/** Renders a card container. */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card"
            className={cn(
                'group/card flex h-full flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
                className
            )}
            {...props}
        />
    );
}

/** Renders a card title. */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-title"
            className={cn('text-base leading-snug font-medium', className)}
            {...props}
        />
    );
}

/** Renders secondary card description text. */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

/** Renders an action area for card controls. */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-action"
            className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
            {...props}
        />
    );
}

/** Renders the main card body. */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-content"
            className={cn('flex-1 px-4', className)}
            {...props}
        />
    );
}

export { Card, CardAction, CardContent, CardDescription, CardTitle };
