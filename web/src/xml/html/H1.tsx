import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a level 1 heading with standard styling. */
export function H1({ children, ...props }: ComponentPropsWithoutRef<'h1'> & BaseProps) {
    return (
        <h1 className="text-4xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {children}
        </h1>
    );
}
