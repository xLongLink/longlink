import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a level 1 heading with standard styling. */
export function H1({ children, className, ...props }: ComponentPropsWithoutRef<'h1'> & BaseProps) {
    return (
        <h1 className={cn('text-4xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h1>
    );
}

/** Renders a level 2 heading with standard styling. */
export function H2({ children, className, ...props }: ComponentPropsWithoutRef<'h2'> & BaseProps) {
    return (
        <h2 className={cn('text-3xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h2>
    );
}

export function H3({ children, className, ...props }: ComponentPropsWithoutRef<'h3'> & BaseProps) {
    return (
        <h3 className={cn('text-2xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h3>
    );
}

export function H4({ children, className, ...props }: ComponentPropsWithoutRef<'h4'> & BaseProps) {
    return (
        <h4 className={cn('text-xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h4>
    );
}

export function P({ children, className, ...props }: ComponentPropsWithoutRef<'p'> & BaseProps) {
    return (
        <p className={cn('leading-7 [&:not(:first-child)]:mt-6', className)} {...props}>
            {children}
        </p>
    );
}

export function Blockquote({ children, className, ...props }: ComponentPropsWithoutRef<'blockquote'> & BaseProps) {
    return (
        <blockquote className={cn('mt-6 border-l-2 pl-6 italic', className)} {...props}>
            {children}
        </blockquote>
    );
}

export function Ul({ children, className, ...props }: ComponentPropsWithoutRef<'ul'> & BaseProps) {
    return (
        <ul className={cn('my-6 ml-6 list-disc [&>li]:mt-2', className)} {...props}>
            {children}
        </ul>
    );
}

export function Li({ children, className, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    return (
        <li className={cn('', className)} {...props}>
            {children}
        </li>
    );
}

/** Renders an inline code element with standard styling. */
export function Code({ children, className, ...props }: ComponentPropsWithoutRef<'code'> & BaseProps) {
    return (
        <code
            className={cn('rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground', className)}
            {...props}
        >
            {children}
        </code>
    );
}
