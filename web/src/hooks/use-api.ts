import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

import { ApiError, apiQueryKey, fetchApiJson } from '@/lib/api';

type UseApiQueryOptions<TData> = Omit<
    UseQueryOptions<TData, Error, TData, ReturnType<typeof apiQueryKey>>,
    'queryKey' | 'queryFn'
> & {
    notFound?: TData;
    request?: RequestInit;
};

/** Fetches one API resource through the shared transport and React Query cache. */
export function useApiQuery<TData>(
    path: string,
    options: UseApiQueryOptions<TData> = {}
): UseQueryResult<TData, Error> {
    const { notFound, request, ...queryOptions } = options;

    return useQuery<TData, Error, TData, ReturnType<typeof apiQueryKey>>({
        ...queryOptions,
        queryKey: apiQueryKey(path),
        queryFn: async () => {
            try {
                return await fetchApiJson<TData>(path, request);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404 && 'notFound' in options) {
                    return notFound as TData;
                }

                throw error;
            }
        },
    });
}
