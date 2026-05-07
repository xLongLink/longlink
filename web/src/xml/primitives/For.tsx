import type { XMLComponent } from '@xml';
import { RenderXML, RuntimeProvider, useContext, useUrl } from '@xml';
import type { ASTNode } from '@xml/types';
import { Fragment } from 'react';

/** Props accepted by the XML For component. */
export interface ForProps {
    as: string;
    each: unknown[];
    children: ASTNode | ASTNode[];
}

/** Iterates over an array and renders children in a scoped context. */
export const For: XMLComponent<ForProps> = ({ each, as, children }) => {
    const { ctx } = useContext();
    const baseUrl = useUrl('');

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
                <RuntimeProvider value={childCtx}>
                    <RenderXML ast={Array.isArray(children) ? children : [children]} ctx={childCtx} baseUrl={baseUrl} />
                </RuntimeProvider>
            </Fragment>
        );
    });
};
