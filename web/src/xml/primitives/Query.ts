import { resolveUrl } from '@/xml';
import { toast } from 'sonner';
import type { ExecutionContext } from '../types';

/** Props accepted by the XML Query component. */
export interface QueryProps {
    id: string;
    path: string;
}

type QueryEntry = {
    data?: unknown;
    promise?: Promise<unknown>;
};

const queryCache = new Map<string, QueryEntry>();

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query(ctx: ExecutionContext, { id, path }: QueryProps): void {
    const values = ctx.values ?? (ctx.values = {});
    const url = resolveUrl(ctx.baseUrl ?? '', path);
    const cached = queryCache.get(url);

    if (cached?.data !== undefined) {
        values[id] = cached.data;
        return;
    }

    if (cached?.promise) {
        throw cached.promise;
    }

    /* Start the request during render and suspend until it resolves. */
    const promise = fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

            return response.json();
        })
        .then((data) => {
            queryCache.set(url, { data });
            values[id] = data;
            return data;
        })
        .catch((error: unknown) => {
            queryCache.delete(url);
            toast.error(error instanceof Error ? error.message : 'Failed to load query data');
            throw error;
        });

    queryCache.set(url, { promise });
    throw promise;
}
