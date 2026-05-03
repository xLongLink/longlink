import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a blockquote with standard styling. */
export function Blockquote({ children, ...props }: ComponentPropsWithoutRef<'blockquote'> & BaseProps) {
    return (
        <blockquote className="mt-6 border-l-2 pl-6 italic" {...props}>
            {children}
        </blockquote>
    );
}
