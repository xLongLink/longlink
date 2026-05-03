import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a level 1 heading with standard styling. */
export function H1({ children, ...props }: ComponentPropsWithoutRef<'h1'> & BaseProps) {
    return (
        <h1 className="text-4xl font-semibold tracking-tight" {...props}>
            {children}
        </h1>
    );
}

/** Renders a level 2 heading with standard styling. */
export function H2({ children, ...props }: ComponentPropsWithoutRef<'h2'> & BaseProps) {
    return (
        <h2 className="text-3xl font-semibold tracking-tight" {...props}>
            {children}
        </h2>
    );
}

export function H3({ children, ...props }: ComponentPropsWithoutRef<'h3'> & BaseProps) {
    return (
        <h3 className="text-2xl font-semibold tracking-tight" {...props}>
            {children}
        </h3>
    );
}

export function H4({ children, ...props }: ComponentPropsWithoutRef<'h4'> & BaseProps) {
    return (
        <h4 className="text-xl font-semibold tracking-tight" {...props}>
            {children}
        </h4>
    );
}

export function P({ children, ...props }: ComponentPropsWithoutRef<'p'> & BaseProps) {
    return (
        <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
            {children}
        </p>
    );
}

export function Blockquote({ children, ...props }: ComponentPropsWithoutRef<'blockquote'> & BaseProps) {
    return (
        <blockquote className="mt-6 border-l-2 pl-6 italic" {...props}>
            {children}
        </blockquote>
    );
}

export function Ul({ children, ...props }: ComponentPropsWithoutRef<'ul'> & BaseProps) {
    return (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
            {children}
        </ul>
    );
}

export function Li({ children, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    return <li {...props}>{children}</li>;
}

/** Renders an inline code element with standard styling. */
export function Code({ children, ...props }: ComponentPropsWithoutRef<'code'> & BaseProps) {
    return (
        <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props}>
            {children}
        </code>
    );
}
