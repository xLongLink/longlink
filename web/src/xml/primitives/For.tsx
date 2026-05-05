import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, RuntimeProvider, useContext } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const each = evaluate(props.each ?? '', context, 'string');
    const as = evaluate(props.as ?? '', context, 'string');
    if (!each) throw new Error('For requires an "each" parameter');
    if (!as) throw new Error('For requires an "as" parameter');

    const items = evaluate(each, context.ctx) ?? [];

    if (!Array.isArray(items)) return null;

    return items.map((item, index) => {
        const childCtx = { ...context.ctx, scope: { ...context.ctx.scope, [as]: item, $index: index } };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={{ ...context, ctx: childCtx, props, children }}>
                    {renderNode(children, childCtx)}
                </RuntimeProvider>
            </Fragment>
        );
    });
}
