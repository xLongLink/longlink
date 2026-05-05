import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a list item. */
export function Li({ children, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    const { registry, ctx } = useRuntime();

    return <li {...props}>{renderNode(children, registry, ctx)}</li>;
}
