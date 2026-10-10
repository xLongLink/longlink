import { api } from '@/lib/api';
import { useCallback } from 'react';
import type { StandardSchemaV1, StandardSchemaV1InferOutput } from 'ky';
import { useQueryClient, useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';

/** Returns API-validated data and an awaitable invalidator scoped to the full request path. */
export function useApi<Schema extends StandardSchemaV1>(
    path: string,
    schema: Schema,
    options?: Pick<
        UseSuspenseQueryOptions<
            StandardSchemaV1InferOutput<Schema>,
            Error,
            StandardSchemaV1InferOutput<Schema>,
            readonly ['api', string]
        >,
        'refetchInterval'
    >
): readonly [StandardSchemaV1InferOutput<Schema>, () => Promise<void>] {
    const client = useQueryClient();

    // A configured interval owns polling notifications even while its callback pauses refetching.
    const { data } = useSuspenseQuery({
        ...options,
        meta: { polling: Boolean(options?.refetchInterval) },
        queryKey: ['api', path],
        queryFn: ({ signal }) => api(path, { signal }).json(schema),
        retry: false,
        staleTime: 0,
    });

    const invalidate = useCallback(
        () => client.invalidateQueries({ queryKey: ['api', path], exact: true }),
        [client, path]
    );

    return [data, invalidate];
}
