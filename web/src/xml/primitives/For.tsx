import type { RenderableASTNode, XMLComponent } from '@xml';
import { renderNode, RuntimeProvider, useContext } from '@xml';
import { Fragment } from 'react';

/** Props accepted by the XML For component. */
export interface ForProps {
    as: string;
    each: unknown[] | string;
    children?: RenderableASTNode;
}

/** Iterates over an array and renders children in a scoped context. */
export const For: XMLComponent<ForProps> = ({ each, as, children }) => {
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
};
