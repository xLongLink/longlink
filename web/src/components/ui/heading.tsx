import type { HTMLAttributes, ReactNode } from 'react';

import { cva } from 'class-variance-authority';

import type { ASTNode } from '../../xml/types';

import { cn } from '@/lib/utils';

const headingVariants = cva('group relative', {
    variants: {
        level: {
            h1: 'scroll-m-20 text-4xl font-semibold tracking-tight',
            h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
            h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
            h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
        },
    },
    defaultVariants: {
        level: 'h1',
    },
});

/** Props accepted by the shared heading UI component. */
export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
    anchorClassName?: string;
    children?: ReactNode;
    id?: string;
    level: 'h1' | 'h2' | 'h3' | 'h4';
    source?: ASTNode[];
}

/** Renders a styled heading with an optional hover hash link. */
export function Heading({ anchorClassName = '', children, className, id, level, source, ...props }: HeadingProps) {
    const Tag = level;
    const resolvedId = id?.trim() || slugifyHeading(extractHeadingText(source ?? [], children));

    return (
        <Tag className={cn(headingVariants({ level }), className)} id={resolvedId || undefined} {...props}>
            {resolvedId ? (
                <a
                    aria-label="Link to this heading"
                    className={cn(
                        'absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100',
                        anchorClassName
                    )}
                    href={`#${resolvedId}`}
                >
                    #
                </a>
            ) : null}
            {children}
        </Tag>
    );
}

/** Extracts readable text from heading content for slug generation. */
function extractHeadingText(nodes: ASTNode[], children: ReactNode): string {
    if (typeof children === 'string') {
        return children.trim();
    }

    return nodes
        .flatMap((node) => extractHeadingText(node.children ?? [], ''))
        .join(' ')
        .trim();
}

/** Converts heading text into a URL-safe slug. */
function slugifyHeading(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
