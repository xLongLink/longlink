import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a level 3 heading with standard styling. */
export function H3({ children, ...props }: ComponentPropsWithoutRef<'h3'> & BaseProps) {
    return (
        <h3 className="text-2xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {children}
        </h3>
    );
}
