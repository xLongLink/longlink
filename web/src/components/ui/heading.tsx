import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

const headingClassNames: Record<HeadingLevel, string> = {
    h1: 'scroll-m-20 text-4xl font-semibold tracking-tight',
    h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
    h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
    h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
};

/** Props accepted by the shared heading UI component. */
export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
    children?: ReactNode;
    id?: string;
    level: HeadingLevel;
}

/** Renders a styled heading with a stable fragment id. */
export function Heading({ children, className, id, level, ...props }: HeadingProps) {
    const Tag = level;
    const resolvedId = id?.trim();

    return (
        <Tag className={cn(headingClassNames[level], className)} id={resolvedId || undefined} {...props}>
            {children}
        </Tag>
    );
}
