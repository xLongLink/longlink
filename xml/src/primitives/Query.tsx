import { useQuery } from '@tanstack/react-query';
import { renderNode } from '../renderer/renderNode';
import { interpolate } from '../runtime/interpolate';
import type { PrimitiveProps } from '../types';

export function Query({ node, ctx, registry }: PrimitiveProps) {
    const id = node.params?.id;
    const pathTemplate = node.params?.path;

    if (!id) {
        throw new Error('Query requires an "id" parameter');
    }

    if (!pathTemplate) {
        throw new Error('Query requires a "path" parameter');
    }

    const path = interpolate(pathTemplate, ctx);

    const { data } = useQuery({
        queryKey: [id, path],
        queryFn: async () => {
            const response = await fetch(path);
            return response.json();
        },
    });

    const childCtx = {
        ...ctx,
        queries: {
            ...ctx.queries,
            [id]: data,
        },
    };

    return renderNode(node.children, registry, childCtx);
}
