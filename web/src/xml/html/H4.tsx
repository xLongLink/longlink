import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders a level 4 heading with standard styling. */
export function H4({ children, ...props }: ComponentPropsWithoutRef<'h4'> & BaseProps) {
    const { ctx } = useRuntime();

    return (
        <h4 className="text-xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {renderNode(children, ctx)}
        </h4>
    );
}
