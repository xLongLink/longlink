import type { UseQueryResult } from '@tanstack/react-query';

import { useApiQuery } from '@/hooks/use-api';

type UseCollectionQueryOptions<TData> = {
    retry?: boolean;
    refetchOnMount?: boolean | 'always';
    enabled?: boolean;
    request?: RequestInit;
};

type UseCollectionQueryResult<TData> = UseQueryResult<Array<TData>, Error> & {
    items: Array<TData>;
};

/** Fetches a collection resource and exposes a stable empty array fallback. */
export function useCollectionQuery<TData>(
    path: string | null,
    options: UseCollectionQueryOptions<TData> = {}
): UseCollectionQueryResult<TData> {
    const query = useApiQuery<Array<TData>>(path, {
        retry: options.retry ?? false,
        refetchOnMount: options.refetchOnMount ?? 'always',
        enabled: options.enabled,
        request: options.request,
    });

    return {
        ...query,
        items: query.data ?? [],
    };
}
