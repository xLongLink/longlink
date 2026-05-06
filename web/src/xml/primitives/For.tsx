import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, RuntimeProvider, useContext } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, children }: XmlComponentProps) {
    const { ctx } = useContext();
    if (props.as == null || props.as === '') throw new Error('For requires an "as" parameter');
    if (props.each == null || props.each === '') throw new Error('For requires an "each" parameter');

    const each = evaluate(props.each, ctx);
    const as = String(evaluate(props.as, ctx) ?? '');

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
                <RuntimeProvider value={childCtx}>{renderXml(children)}</RuntimeProvider>
            </Fragment>
        );
    });
}
