import type { Props } from '@xml';
import { ContextProvider, RenderXML, useUrl, useXmlContext } from '@xml';
import { Fragment } from 'react';
import { resolveXmlString, resolveXmlValue } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const each = resolveXmlValue(props, 'each', ctx);
    const as = resolveXmlString(props, 'as', ctx);
    const children = nodes;
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
                    <RenderXML ast={children} ctx={childCtx} baseUrl={baseUrl} />
                </ContextProvider>
            </Fragment>
        );
    });
}
