import { useState } from 'react';
import { renderNode } from '../renderer/renderNode';
import { evaluate } from '../runtime/evaluate';
import { interpolate } from '../runtime/interpolate';
import type { PrimitiveProps } from '../types';

function resolveInitialValue(value: string, ctx: PrimitiveProps['ctx']): unknown {
    const expressionMatch = value.match(/^\{([^}]+)\}$/);
    const expression = expressionMatch?.[1];

    if (expression) {
        return evaluate(expression, ctx);
    }

    return interpolate(value, ctx);
}

export function State({ node, ctx, registry }: PrimitiveProps) {
    const id = node.params?.id;

    if (!id) {
        throw new Error('State requires an "id" parameter');
    }

    const initialState = Object.fromEntries(
        Object.entries(node.params ?? {})
            .filter(([key]) => key !== 'id')
            .map(([key, value]) => [key, resolveInitialValue(value, ctx)])
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
