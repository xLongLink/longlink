import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type BaseProps = {
    children?: ReactNode;
};

export function H1({ children, className, ...props }: ComponentPropsWithoutRef<'h1'> & BaseProps) {
    return (
        <h1 className={cn('text-4xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h1>
    );
}

export function H2({ children, className, ...props }: ComponentPropsWithoutRef<'h2'> & BaseProps) {
    return (
        <h2 className={cn('text-2xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h2>
    );
}

export function H3({ children, className, ...props }: ComponentPropsWithoutRef<'h3'> & BaseProps) {
    return (
        <h3 className={cn('text-xl font-semibold tracking-tight', className)} {...props}>
            {children}
        </h3>
    );
}

export function H4({ children, className, ...props }: ComponentPropsWithoutRef<'h4'> & BaseProps) {
    return (
        <h4 className={cn('text-base font-semibold tracking-tight', className)} {...props}>
            {children}
        </h4>
    );
}

export function P({ children, className, ...props }: ComponentPropsWithoutRef<'p'> & BaseProps) {
    return (
        <p className={cn('text-sm leading-6 text-foreground', className)} {...props}>
            {children}
        </p>
    );
}

export function Blockquote({ children, className, ...props }: ComponentPropsWithoutRef<'blockquote'> & BaseProps) {
    return (
        <blockquote
            className={cn('border-l-2 border-border pl-4 text-sm italic text-muted-foreground', className)}
            {...props}
        >
            {children}
        </blockquote>
    );
}

export function Ul({ children, className, ...props }: ComponentPropsWithoutRef<'ul'> & BaseProps) {
    return (
        <ul className={cn('list-disc space-y-1 pl-5 text-sm text-foreground', className)} {...props}>
            {children}
        </ul>
    );
}

export function Li({ children, className, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    return (
        <li className={cn('pl-1', className)} {...props}>
            {children}
        </li>
    );
}

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
