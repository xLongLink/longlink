import { useEffect, useState } from 'react';
import { type PaginationState, type SortingState } from '@tanstack/react-table';

import { apiFetch } from '@/lib/api';

type TableResponse =
    | Record<string, unknown>[]
    | {
          data?: Record<string, unknown>[];
          total?: number;
      };

type UseApiTableParams = {
    endpoint: string;
    pagination: PaginationState;
    sorting: SortingState;
};

export function useApiTable<T extends object>({
    endpoint,
    pagination,
    sorting,
}: UseApiTableParams) {
    const [data, setData] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            try {
                const response = await apiFetch<TableResponse>(endpoint);

                if (Array.isArray(response)) {
                    setData(response as T[]);
                    setTotal(response.length);
                } else {
                    setData((response.data ?? []) as T[]);
                    setTotal(response.total ?? response.data?.length ?? 0);
                }
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [endpoint, pagination, sorting]);

    return {
        data,
        total,
        loading,
    };
}
