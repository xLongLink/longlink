import type { RenderableASTNode } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a list item. */
export function Li({
    children,
    props: _xmlProps,
    ...props
}: ComponentPropsWithoutRef<'li'> & BaseProps & { props: Record<string, string> }) {
    const context = useContext();

    return <li {...props}>{renderNode(children, context.ctx)}</li>;
}
