import { resolveUrl } from '@xml/core/url';
import type { ExecutionContext } from '@xml/types';
import { toast } from 'sonner';

/** Props accepted by the XML Query component. */
export interface QueryProps {
    id: string;
    path: string;
}

/** Fetches JSON data into a reusable query slot for descendants. */
export function query(ctx: ExecutionContext, { id, path }: QueryProps, baseUrl = ''): void {
    const values = ctx.values ?? (ctx.values = {});
    const url = resolveUrl(baseUrl, path);

    /* Start the request during render and suspend until it resolves. */
    throw fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

            return response.json();
        })
        .then((data) => {
            values[id] = data;
            return data;
        })
        .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Failed to load query data');
            throw error;
        });
}
