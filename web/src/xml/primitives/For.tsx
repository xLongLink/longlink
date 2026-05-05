import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, RuntimeProvider, useContext } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, children }: XmlComponentProps) {
    const context = useContext();
    const eachExpression = props.each;
    const as = String(props.as ?? '');
    if (!eachExpression) throw new Error('For requires an "each" parameter');
    if (!as) throw new Error('For requires an "as" parameter');

    const items =
        typeof eachExpression === 'string' ? (evaluate(eachExpression, context) ?? []) : (eachExpression ?? []);

    if (!Array.isArray(items)) return null;

    return items.map((item, index) => {
        const childCtx = { ...context.ctx, [as]: item, $index: index };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={{ ...context, ctx: childCtx, props, children }}>
                    {renderXml(children)}
                </RuntimeProvider>
            </Fragment>
        );
    });
}
