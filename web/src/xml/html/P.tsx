import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a paragraph with standard styling. */
export function P({ children, ...props }: ComponentPropsWithoutRef<'p'> & BaseProps) {
    return (
        <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
            {children}
        </p>
    );
}
