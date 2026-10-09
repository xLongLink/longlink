import { api } from '@/lib/api';
import { useCallback } from 'react';
import { useQueryClient, useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';

/** Returns API-validated data and an awaitable invalidator scoped to the full request path. */
export function useApi<T = unknown>(
    path: string,
    options?: Pick<UseSuspenseQueryOptions<T, Error, T, readonly ['api', string]>, 'refetchInterval'>
): readonly [T, () => Promise<void>] {
    const client = useQueryClient();

    // A configured interval owns polling notifications even while its callback pauses refetching.
    const { data } = useSuspenseQuery({
        ...options,
        meta: { polling: Boolean(options?.refetchInterval) },
        queryKey: ['api', path],
        queryFn: ({ signal }) => api(path, { signal }).json<T>(),
        retry: false,
        staleTime: 0,
    });

    const invalidate = useCallback(
        () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
        [client, path]
    );

    return [data, invalidate];
}
