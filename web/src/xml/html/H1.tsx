import type { RenderableASTNode } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a level 1 heading with standard styling. */
export function H1({
    children,
    ...props
}: ComponentPropsWithoutRef<'h1'> & BaseProps & { props: Record<string, string> }) {
    const context = useContext();

    return (
        <h1 className="text-4xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {renderNode(children, context.ctx)}
        </h1>
    );
}
