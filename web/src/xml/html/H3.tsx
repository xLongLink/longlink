import type { RenderableASTNode } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a level 3 heading with standard styling. */
export function H3({
    children,
    props: _xmlProps,
    ...props
}: ComponentPropsWithoutRef<'h3'> & BaseProps & { props: Record<string, string> }) {
    const context = useContext();

    return (
        <h3 className="text-2xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {renderNode(children, context.ctx)}
        </h3>
    );
}
