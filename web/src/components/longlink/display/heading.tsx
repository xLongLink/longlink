import { cn } from 'cn';
import type { ComponentPropsWithoutRef } from 'react';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const headings = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

const headingClasses = {
    1: 'text-4xl',
    2: 'text-3xl',
    3: 'text-2xl',
    4: 'text-xl',
    5: 'text-lg',
    6: 'text-base'
} as const;

interface HeadingProps extends Omit<ComponentPropsWithoutRef<'h2'>, 'color'> {
    level?: HeadingLevel;
}

/** Uses one level for heading typography and native document semantics. */
export function Heading({ level = 2, className, ...props }: HeadingProps) {
    const Component = headings[level];

    return (
        <Component
            data-slot="heading"
            {...props}
            className={cn('font-semibold tracking-tight', headingClasses[level], className)}
        />
    );
}
