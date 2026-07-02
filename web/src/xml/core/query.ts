import { fetchApiJson } from '@/lib/api';
import { toast } from 'sonner';
import type { ExecutionContext } from '../types';
import { resolveRequestUrl } from './url';

/** Fetches JSON data into a reusable query slot for descendants. */
export async function query(ctx: ExecutionContext, id: string, path: string, baseUrl = ''): Promise<void> {
    const values = ctx.values;

    /* Start the request during render and suspend until it resolves. */
    try {
        const url = resolveRequestUrl(baseUrl, path);

        values[id] = await fetchApiJson<unknown>(url);
    } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to load query data');
        throw error;
    }
}
