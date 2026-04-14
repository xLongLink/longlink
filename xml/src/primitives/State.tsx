import { useState } from 'react';
import { renderNode } from '../renderer/renderNode';
import { resolveValue } from '../runtime/resolveValue';
import type { PrimitiveProps } from '../types';

export function State({ node, ctx, registry }: PrimitiveProps) {
    const id = node.params?.id;

    if (!id) {
        throw new Error('State requires an "id" parameter');
    }

    const initialState = Object.fromEntries(
        Object.entries(node.params ?? {})
            .filter(([key]) => key !== 'id')
            .map(([key, value]) => [key, resolveValue(value, ctx)])
    );

    const [value, setValue] = useState(initialState);

    const childCtx = {
        ...ctx,
        state: {
            ...ctx.state,
            [id]: [value, setValue] as [any, Function],
        },
    };

    return renderNode(node.children, registry, childCtx);
}
