import { resolveUrl } from '@/xml';
import { toast } from 'sonner';
import type { ExecutionContext } from '../types';

/** Props accepted by the XML Query component. */
export interface QueryProps {
    id: string;
    path: string;
}

const queryCache = new Map<string, unknown>();

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query(ctx: ExecutionContext, { id, path }: QueryProps): void {
    const values = ctx.values ?? (ctx.values = {});
    const url = resolveUrl(ctx.baseUrl ?? '', path);

    if (queryCache.has(url)) {
        values[id] = queryCache.get(url);
        return;
    }

    /* Keep a stable object in context so descendants can read the slot immediately. */
    const slot = values[id] ?? {};
    values[id] = slot;

    void fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

            return response.json();
        })
        .then((data) => {
            queryCache.set(url, data);
            values[id] = data;
        })
        .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Failed to load query data');
        });
}
