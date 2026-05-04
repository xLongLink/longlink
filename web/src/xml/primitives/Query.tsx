import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { RuntimeProvider, useRuntime } from '../runtime';

/**
 * Fetches data via TanStack Query and exposes the result to descendants.
 *
 * - `id`   — key under which the fetched data is available in scope.
 * - `path` — literal request path such as `/apps`.
 *
 * The fetched value is stored in `ctx.queries[id]` and re-exposed as a
 * child scope variable, making it available to nested expressions.
 */
export function Query({ id, path: pathTemplate, children }: { id?: string; path?: string; children?: ReactNode }) {
    if (!id) {
        throw new Error('Query requires an "id" parameter');
    }

    if (!pathTemplate) {
        throw new Error('Query requires a "path" parameter');
    }

    const runtime = useRuntime();
    const { ctx } = runtime;
    const path = pathTemplate;
    const baseUrl = ctx.baseUrl ?? '';
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

    /* Fetch and cache query results via TanStack Query */
    const { data } = useQuery({
        queryKey: [id, url],
        queryFn: async () => {
            const response = await fetch(url);
            return response.json();
        },
    });

    /* Expose fetched data to descendants under the given id */
    const childCtx = {
        ...ctx,
        queries: {
            ...ctx.queries,
            [id]: data,
        },
    };

    return <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>{children}</RuntimeProvider>;
}
