import type { ViewData } from '../protocol';
import { ViewRequestContext } from '../context';
import { useCallback, useContext } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

/** Loads Solution data and invalidates only the complete request path within this View. */
export function useApi(path: string): readonly [ViewData, () => Promise<void>] {
    const request = useContext(ViewRequestContext);
    const client = useQueryClient();

    if (!request) throw new Error('useApi requires the Solution runtime');

    // Keep query parameters in cache identity, including pagination and filters.
    const { data } = useSuspenseQuery({ queryKey: ['api', path], queryFn: () => request(path) });

    const invalidate = useCallback(
        () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
        [client, path]
    );

    return [data, invalidate];
}
