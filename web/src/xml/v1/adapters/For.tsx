import { Fragment } from 'react';
import { ContextProvider, useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ items, props, nodes }: Props & { items: unknown[] }) {
    const { ctx } = useXmlContext();
    const as = resolveXmlString(props, 'as', ctx);

    return items.map((item, index) => {
        const childCtx: typeof ctx = {
            ...ctx,
            parent: ctx,
            values: {
                [as]: item,
                index,
            },
        };

        return (
            <Fragment key={index}>
                <ContextProvider value={childCtx}>{renderNode(nodes, childCtx)}</ContextProvider>
            </Fragment>
        );
    });
}
