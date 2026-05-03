import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a list item. */
export function Li({ children, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    return <li {...props}>{children}</li>;
}
