import type { z } from 'zod';
import { api } from '@/lib/api';
import { queryOptions, skipToken, useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';

/** Builds validated Platform reads with a shared cache identity and request policy. */
export function apiQueryOptions<T>(path: string, schema: z.ZodType<T>) {
    return queryOptions<T, Error, T, readonly ['api', string | null]>({
        queryKey: ['api', path],
        queryFn: async ({ signal }) => schema.parse(await api(path, { signal }).json()),
        retry: false,
        staleTime: 0,
    });
}

/** Returns validated data; shared boundaries own initial loading and failures. */
export function useApi<T>(path: string, schema: z.ZodType<T>): T {
    const { data } = useSuspenseQuery(apiQueryOptions(path, schema));
    return data;
}

/** Reads and validates Platform data, disabling dependent queries until their path is known. */
export function useApiQuery<T>(path: string | null, schema: z.ZodType<T>) {
    return useQuery(
        path === null
            ? { queryKey: ['api', path] as const, queryFn: skipToken, retry: false, staleTime: 0 }
            : apiQueryOptions(path, schema)
    );
}

/** Runs a page action with pending state and root-owned mutation error reporting. */
export function useAction() {
    return useMutation({ mutationFn: (run: () => Promise<void>) => run() });
}
