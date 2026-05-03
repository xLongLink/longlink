import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders an unordered list with standard styling. */
export function Ul({ children, ...props }: ComponentPropsWithoutRef<'ul'> & BaseProps) {
    return (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
            {children}
        </ul>
    );
}
