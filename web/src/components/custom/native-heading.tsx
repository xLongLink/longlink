import { cn } from 'cn';
import type { HTMLAttributes, Ref } from 'react';

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

/** Keeps visual heading size independent from the accessible document outline. */
export function NativeHeading({
    level = 2,
    accessibilityLevel,
    className,
    ...props
}: Omit<HTMLAttributes<HTMLHeadingElement>, 'color'> & {
    level?: HeadingLevel;
    accessibilityLevel?: HeadingLevel;
    ref?: Ref<HTMLHeadingElement>;
}) {
    const Component = headings[level];

    return (
        <Component
            {...props}
            aria-level={props['aria-level'] ?? (accessibilityLevel !== level ? accessibilityLevel : undefined)}
            className={cn('font-semibold tracking-tight', headingClasses[level], className)}
        />
    );
}
