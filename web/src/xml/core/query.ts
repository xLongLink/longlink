import { resolveUrl } from '@xml/core/url';
import type { ExecutionContext } from '@xml/types';
import { toast } from 'sonner';

/** Fetches JSON data into a reusable query slot for descendants. */
export async function query(
    ctx: ExecutionContext,
    id: string,
    path: string,
    baseUrl = '',
    resolvedUrl?: string
): Promise<void> {
    const values = ctx.values ?? (ctx.values = {});
    const url = resolvedUrl ?? resolveUrl(baseUrl, path);

    /* Start the request during render and suspend until it resolves. */
    try {
        const response = await fetch(url);

        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

        values[id] = await response.json();
    } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to load query data');
        throw error;
    }
}
