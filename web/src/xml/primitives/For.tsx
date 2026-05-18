import { ContextProvider, RenderXML, useUrl, useXmlContext } from '@xml';
import type { ASTNode } from '@xml/types';
import { Fragment } from 'react';

/** Props accepted by the XML For component. */
export interface ForProps {
    as: string;
    each: unknown[];
    children: ASTNode[];
}

/** Iterates over an array and renders children in a scoped context. */
export function For({ each, as, children }: ForProps) {
    const { ctx } = useXmlContext();
    const baseUrl = useUrl('');

    return each.map((item, index) => {
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
