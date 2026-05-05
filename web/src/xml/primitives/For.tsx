import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, RuntimeProvider, useContext } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props: rawProps, children }: XmlComponentProps) {
    const { ctx, baseUrl, setters, props: contextProps, children } = useContext();
    const eachExpression = evaluate(rawProps.each ?? '', ctx);
    const as = String(evaluate(rawProps.as ?? '', ctx) ?? '');
    if (!eachExpression) throw new Error('For requires an "each" parameter');
    if (!as) throw new Error('For requires an "as" parameter');

    const items = Array.isArray(eachExpression) ? eachExpression : [];

    if (!Array.isArray(items)) return null;

    return items.map((item, index) => {
        const childCtx = { ...ctx, [as]: item, $index: index };

        return (
            <Fragment key={index}>
                <RuntimeProvider
                    value={{ ctx: childCtx, baseUrl, setters, props: { each: eachExpression, as }, children }}
                >
                    {renderXml(children)}
                </RuntimeProvider>
            </Fragment>
        );
    });
}
