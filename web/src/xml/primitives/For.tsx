import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, RuntimeProvider, useRuntime } from '@/xml';
import { Fragment } from 'react';

/** Iterates over an array and renders children in a scoped context. */
export function For({ each, as, children }: { each?: string; as?: string; children?: RenderableASTNode }) {
    if (!each) throw new Error('For requires an "each" parameter');
    if (!as) throw new Error('For requires an "as" parameter');

    const runtime = useRuntime();
    const { ctx } = runtime;
    const items = evaluate(normalizeEachExpression(each), ctx) ?? [];

    if (!Array.isArray(items)) return null;

    return items.map((item, index) => {
        const childCtx = { ...ctx, scope: { ...ctx.scope, [as]: item, $index: index } };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>
                    {renderNode(children, childCtx)}
                </RuntimeProvider>
            </Fragment>
        );
    });
}

/** Normalizes the `each` expression into a raw JavaScript expression string. */
function normalizeEachExpression(each: string): string {
    const trimmed = each.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed.slice(1, -1).trim() : trimmed;
}
