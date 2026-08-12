import type { UseQueryResult } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/use-api';

type UseCollectionQueryOptions<TData> = {
    retry?: boolean;
    refetchInterval?: number;
    parse: (value: unknown) => TData[];
};

type UseCollectionQueryResult<TData> = UseQueryResult<TData[], Error> & {
    items: TData[];
};

/** Fetches a collection resource and exposes an empty array fallback. */
export function useCollectionQuery<TData>(
    path: string | null,
    options: UseCollectionQueryOptions<TData>
): UseCollectionQueryResult<TData> {
    const query = useApiQuery<TData[]>(path, {
        retry: options.retry ?? false,
        refetchInterval: options.refetchInterval,
        parse: options.parse,
    });

    return {
        ...query,
        items: query.data ?? [],
    };
}
