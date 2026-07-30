import type { UseQueryResult } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/use-api';

type UseCollectionQueryOptions<TData> = {
    retry?: boolean;
    refetchInterval?: number;
    parse: (value: unknown) => TData[];
};

type UseCollectionQueryResult<TData> = UseQueryResult<Array<TData>, Error> & {
    items: Array<TData>;
};

const EMPTY_COLLECTION: never[] = [];
Object.freeze(EMPTY_COLLECTION);

/** Fetches a collection resource and exposes a stable empty array fallback. */
export function useCollectionQuery<TData>(
    path: string | null,
    options: UseCollectionQueryOptions<TData>
): UseCollectionQueryResult<TData> {
    const query = useApiQuery<Array<TData>>(path, {
        retry: options.retry ?? false,
        refetchInterval: options.refetchInterval,
        parse: options.parse,
    });

    return {
        ...query,
        items: query.data ?? EMPTY_COLLECTION,
    };
}
