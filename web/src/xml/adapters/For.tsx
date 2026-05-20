import { ContextProvider, useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { BaseUrlContext, useUrl } from '@xml/core/url';
import type { Props } from '@xml/types';
import { Fragment } from 'react';
import { resolveXmlString, resolveXmlValue } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const each = resolveXmlValue(props, 'each', ctx);
    const as = resolveXmlString(props, 'as', ctx);
    const baseUrl = useUrl('');

    return (Array.isArray(each) ? each : []).map((item, index) => {
        const childCtx: typeof ctx = {
            parent: ctx,
            setups: ctx.setups,
            invalidate: ctx.invalidate,
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
