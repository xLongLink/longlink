import type { z } from 'zod';
import { api } from '@/lib/api';
import { useCallback } from 'react';
import { useQueryClient, useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';

/** Returns validated data and an awaitable invalidator scoped to the full request path. */
export function useApi<T>(
    path: string,
    schema: z.ZodType<T>,
    options: Pick<UseSuspenseQueryOptions<T, Error, T, readonly ['api', string]>, 'refetchInterval' | 'meta'> = {}
): readonly [T, () => Promise<void>] {
    const client = useQueryClient();
    const { data } = useSuspenseQuery({
        ...options,
        queryKey: ['api', path],
        queryFn: async ({ signal }) => schema.parse(await api(path, { signal }).json()),
        retry: false,
        staleTime: 0,
    });
    const invalidate = useCallback(
        () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
        [client, path]
    );
    return [data, invalidate];
}
