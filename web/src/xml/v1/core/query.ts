import { fetchApiJson } from '@/lib/api';
import type { ExecutionContext } from '../types';
import { resolveRequestUrl } from './url';

/** Fetches JSON data into a reusable query slot for descendants. */
export async function query(ctx: ExecutionContext, id: string, path: string, baseUrl = ''): Promise<void> {
    const values = ctx.values;

    // Let the renderer's error boundary surface setup failures in the XML area.
    const url = resolveRequestUrl(baseUrl, path);

    values[id] = await fetchApiJson<unknown>(url);
}
