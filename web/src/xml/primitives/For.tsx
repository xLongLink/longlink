import { Fragment, type ReactNode } from 'react';
import { evaluate, RuntimeProvider, useRuntime } from '../runtime';
import { renderNode } from '../renderers';

// ---------------------------------------------------------------------------
// For
// ---------------------------------------------------------------------------

/**
 * Iterates over a collection and renders children once per item.
 *
 * - `each` — expression that evaluates to an array in the current context.
 * - `as`   — name under which each item is exposed to child expressions.
 *
 * Each iteration also injects `$index` into scope.
 * Non-array results are silently ignored (renders nothing).
 */
export function For({
    each,
    as,
    __xmlChildren,
    children,
}: {
    each?: string;
    as?: string;
    __xmlChildren?: unknown;
    children?: ReactNode;
}) {
    if (!each) {
        throw new Error('For requires an "each" parameter');
    }

    if (!as) {
        throw new Error('For requires an "as" parameter');
    }

    const runtime = useRuntime();
    const { ctx } = runtime;

    /* Allow `each` to be written as either `items` or `{items}` in XML. */
    const items = evaluate(normalizeEachExpression(each), ctx) ?? [];

    if (!Array.isArray(items)) {
        return null;
    }

    /* Inject item and $index into scope for each iteration */
    return items.map((item, index) => {
        const childCtx = {
            ...ctx,
            scope: {
                ...ctx.scope,
                [as]: item,
                $index: index,
            },
        };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>
                    {__xmlChildren ? renderNode(__xmlChildren as any, runtime.registry, childCtx) : children}
                </RuntimeProvider>
            </Fragment>
        );
    });
}

/**
 * Normalizes a For `each` expression to the raw JavaScript expression.
 */
function normalizeEachExpression(each: string): string {
    const trimmed = each.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return trimmed.slice(1, -1).trim();
    }

    return trimmed;
}
