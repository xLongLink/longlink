import { Fragment } from 'react';
import { ContextProvider, useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import { BaseUrlContext, useUrl } from '@/xml/core/url';
import type { Props } from '@/xml/types';
import { resolveXmlString } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ items, props, nodes }: Props & { items: unknown[] }) {
    const { ctx } = useXmlContext();
    const as = resolveXmlString(props, 'as', ctx);
    const baseUrl = useUrl('');

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
                <ContextProvider value={childCtx}>
                    <BaseUrlContext.Provider value={baseUrl}>{renderNode(nodes, childCtx)}</BaseUrlContext.Provider>
                </ContextProvider>
            </Fragment>
        );
    });
}
