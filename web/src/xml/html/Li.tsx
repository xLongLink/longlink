import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a list item. */
export function Li({ children, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    const { registry, ctx } = useRuntime();

    return <li {...props}>{renderNode(children as any, registry, ctx)}</li>;
}
