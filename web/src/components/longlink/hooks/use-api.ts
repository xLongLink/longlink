import { useCallback, useContext } from 'react';
import { RequestContext } from '@/lib/view-capabilities';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

/** Loads Solution data with a caller-declared response shape and invalidates the complete request path. */
export function useApi<T = unknown>(path: string): readonly [T, () => Promise<void>] {
    const request = useContext(RequestContext);
    const client = useQueryClient();

    if (!request) throw new Error('useApi requires the Solution runtime');

    // Keep query parameters in cache identity, including pagination and filters.
    const { data } = useSuspenseQuery({ queryKey: ['api', path], queryFn: () => request(path) });

    const invalidate = useCallback(
        () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
        [client, path]
    );

    return [data as T, invalidate];
}
