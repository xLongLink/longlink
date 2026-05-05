import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, RuntimeProvider, useContext } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const eachExpression = props.each ?? '';
    const as = evaluate(props.as ?? '', context, 'string');
    if (!eachExpression) throw new Error('For requires an "each" parameter');
    if (!as) throw new Error('For requires an "as" parameter');

    const items =
        evaluate(
            eachExpression.startsWith('$') || eachExpression.includes('{') ? eachExpression : `$${eachExpression}`,
            context
        ) ?? [];

    if (!Array.isArray(items)) return null;

    return items.map((item, index) => {
        const childCtx = { ...context.ctx, [as]: item, $index: index };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={{ ...context, ctx: childCtx, props, children }}>
                    {renderNode(children, childCtx)}
                </RuntimeProvider>
            </Fragment>
        );
    });
}
