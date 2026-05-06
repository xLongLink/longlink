import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, RuntimeProvider, useContext } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, children }: XmlComponentProps) {
    const { ctx, states } = useContext();
    if (props.each == null || props.each === '') throw new Error('For requires an "each" parameter');
    if (props.as == null || props.as === '') throw new Error('For requires an "as" parameter');

    const eachExpression = evaluate(props.each, ctx);
    const as = String(evaluate(props.as, ctx) ?? '');

    if (!Array.isArray(eachExpression)) return null;

    return eachExpression.map((item, index) => {
        const childCtx = { ...ctx, [as]: item, $index: index };

        return (
            <Fragment key={index}>
                <RuntimeProvider
                    value={{
                        ctx: childCtx,
                        states,
                        props: { each: props.each, as: props.as },
                        children,
                    }}
                >
                    {renderXml(children)}
                </RuntimeProvider>
            </Fragment>
        );
    });
}
