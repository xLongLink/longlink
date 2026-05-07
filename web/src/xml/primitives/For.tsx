import { renderNode, RuntimeProvider, useContext } from '@/xml';
import type { RenderableASTNode } from '@/xml';
import { Fragment } from 'react';

/** Props accepted by the XML For component. */
export interface ForProps {
    as: string;
    each: unknown;
}

/** Iterates over an array and renders children in a scoped context. */
export function For({ each, as, children }: ForProps & { children?: RenderableASTNode }) {
    const { ctx } = useContext();

    if (!Array.isArray(each)) return null;

    return each.map((item, index) => {
        const childCtx = {
            parent: ctx,
            values: {
                [as]: item,
                index,
            },
        };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={childCtx}>{children ? renderNode(children) : null}</RuntimeProvider>
            </Fragment>
        );
    });
}
