import { useQuery, useQueryClient, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { userProfileQueryKey } from '@/lib/query-keys';
import { clearSessionQueries } from '@/lib/react-query';
import { ApiError, apiQueryKey, fetchApiJson } from '@/lib/api';

type UseApiQueryOptions<TQueryFnData, TData = TQueryFnData> = Omit<
    UseQueryOptions<TQueryFnData, Error, TData, Array<string>>,
    'queryKey' | 'queryFn'
> & {
    parse: (value: unknown) => TQueryFnData;
};

/** Fetches one API resource through the shared transport and React Query cache. */
export function useApiQuery<TQueryFnData, TData = TQueryFnData>(
    path: string | null,
    options: UseApiQueryOptions<TQueryFnData, TData>
): UseQueryResult<TData, Error> {
    const { parse, ...queryOptions } = options;
    const queryClient = useQueryClient();

    return useQuery<TQueryFnData, Error, TData, Array<string>>({
        ...queryOptions,
        enabled: path !== null && (queryOptions.enabled ?? true),
        queryKey: path !== null ? apiQueryKey(path) : ['api', 'disabled'],
        queryFn: async ({ signal }) => {
            // Normalize known API errors before React Query stores them.
            try {
                return await fetchApiJson<TQueryFnData>(path!, { signal }, parse);
            } catch (error) {
                // Clear the cached session immediately when any request reports auth loss.
                if (error instanceof ApiError && error.status === 401) {
                    await clearSessionQueries(queryClient, [userProfileQueryKey]);
                    queryClient.setQueryData(userProfileQueryKey, null);
                }

                throw error;
            }
        },
    });
}
