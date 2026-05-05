import type { RenderableASTNode } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a level 2 heading with standard styling. */
export function H2({ children, ...props }: ComponentPropsWithoutRef<'h2'> & BaseProps) {
    const context = useContext();

    return (
        <h2 className="text-3xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {renderNode(children, context.ctx)}
        </h2>
    );
}
