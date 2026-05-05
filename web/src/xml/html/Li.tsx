import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a list item. */
export function Li({ children, ...props }: ComponentPropsWithoutRef<'li'> & BaseProps) {
    const { ctx } = useRuntime();

    return <li {...props}>{renderNode(children, ctx)}</li>;
}
