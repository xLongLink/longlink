import { useQuery, useQueryClient, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

import { ApiError, apiQueryKey, fetchApiJson } from '@/lib/api';

type UseApiQueryOptions<TData> = Omit<UseQueryOptions<TData, Error, TData, Array<string>>, 'queryKey' | 'queryFn'> & {
    notFound?: TData;
    request?: RequestInit;
};

/** Fetches one API resource through the shared transport and React Query cache. */
export function useApiQuery<TData>(
    path: string | null,
    options: UseApiQueryOptions<TData> = {}
): UseQueryResult<TData, Error> {
    const { notFound, request, ...queryOptions } = options;
    const queryClient = useQueryClient();

    const enabled = path !== null && (queryOptions.enabled ?? true);

    return useQuery<TData, Error, TData, Array<string>>({
        ...queryOptions,
        enabled,
        queryKey: path !== null ? apiQueryKey(path) : ['api', 'disabled'],
        queryFn: async () => {
            try {
                return await fetchApiJson<TData>(path!, request);
            } catch (error) {
                // Clear the cached session immediately when any request reports auth loss.
                if (error instanceof ApiError && error.status === 401) {
                    queryClient.setQueryData(apiQueryKey('/api/me'), null);
                }

                if (error instanceof ApiError && error.status === 404 && 'notFound' in options) {
                    return notFound as TData;
                }

                throw error;
            }
        },
    });
}
