import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

type BaseProps = {
    children?: RenderableASTNode;
};

/** Renders an unordered list with standard styling. */
export function Ul({ children, ...props }: ComponentPropsWithoutRef<'ul'> & BaseProps) {
    const { registry, ctx } = useRuntime();

    return (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
            {renderNode(children, registry, ctx)}
        </ul>
    );
}
