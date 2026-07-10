import { useQuery, useQueryClient, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

import { ApiError, apiQueryKey, fetchApiJson } from '@/lib/api';

type UseApiQueryOptions<TQueryFnData, TData = TQueryFnData> = Omit<
    UseQueryOptions<TQueryFnData, Error, TData, Array<string>>,
    'queryKey' | 'queryFn'
> & {
    notFound?: TQueryFnData;
    parse?: (value: unknown) => TQueryFnData;
    request?: RequestInit;
};

/** Fetches one API resource through the shared transport and React Query cache. */
export function useApiQuery<TQueryFnData, TData = TQueryFnData>(
    path: string | null,
    options: UseApiQueryOptions<TQueryFnData, TData> = {}
): UseQueryResult<TData, Error> {
    const { notFound, parse, request, ...queryOptions } = options;
    const queryClient = useQueryClient();

    const enabled = path !== null && (queryOptions.enabled ?? true);

    return useQuery<TQueryFnData, Error, TData, Array<string>>({
        ...queryOptions,
        enabled,
        queryKey: path !== null ? apiQueryKey(path) : ['api', 'disabled'],
        queryFn: async ({ signal }) => {
            // Normalize known API errors before React Query stores them.
            try {
                return await fetchApiJson<TQueryFnData>(path!, request ? { ...request, signal } : { signal }, parse);
            } catch (error) {
                // Clear the cached session immediately when any request reports auth loss.
                if (error instanceof ApiError && error.status === 401) {
                    queryClient.setQueryData(apiQueryKey('/api/me'), null);
                }

                // Allow callers to supply an explicit 404 fallback.
                if (error instanceof ApiError && error.status === 404 && 'notFound' in options) {
                    return notFound as TQueryFnData;
                }

                throw error;
            }
        },
    });
}
