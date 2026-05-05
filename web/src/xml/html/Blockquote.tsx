import type { RenderableASTNode } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a blockquote with standard styling. */
export function Blockquote({
    children,
    props: _xmlProps,
    ...props
}: ComponentPropsWithoutRef<'blockquote'> & BaseProps & { props: Record<string, string> }) {
    const context = useContext();

    return (
        <blockquote className="mt-6 border-l-2 pl-6 italic" {...props}>
            {renderNode(children, context.ctx)}
        </blockquote>
    );
}
