import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { interpolate } from '../runtime/interpolate';
import { RuntimeProvider, useRuntime } from '../runtime/useRuntime';

export function Query({ id, path: pathTemplate, children }: { id?: string; path?: string; children?: ReactNode }) {
    if (!id) {
        throw new Error('Query requires an "id" parameter');
    }

    if (!pathTemplate) {
        throw new Error('Query requires a "path" parameter');
    }

    const runtime = useRuntime();
    const { ctx } = runtime;
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

    return <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>{children}</RuntimeProvider>;
}
