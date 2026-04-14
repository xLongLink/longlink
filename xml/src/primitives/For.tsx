import { Fragment } from 'react';
import { renderNode } from '../renderer/renderNode';
import { evaluate } from '../runtime/evaluate';
import type { PrimitiveProps } from '../types';

export function For({ node, ctx, registry }: PrimitiveProps) {
    const each = node.params?.each;
    const as = node.params?.as;

    if (!each) {
        throw new Error('For requires an "each" parameter');
    }

    if (!as) {
        throw new Error('For requires an "as" parameter');
    }

    const items = evaluate(each, ctx);

    if (!Array.isArray(items)) {
        return null;
    }

    return items.map((item, index) => {
        const childCtx = {
            ...ctx,
            scope: {
                ...ctx.scope,
                [as]: item,
                $index: index,
            },
        };

        return <Fragment key={index}>{renderNode(node.children, registry, childCtx)}</Fragment>;
    });
}
