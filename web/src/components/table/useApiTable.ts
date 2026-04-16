import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';

type TableResponse =
    | Record<string, unknown>[]
    | {
          data?: Record<string, unknown>[];
          total?: number;
      };

type UseApiTableParams = {
    endpoint: string;
};

/** Hook that fetches and manages table data from API endpoint. */
export function useApiTable<T extends object>({ endpoint }: UseApiTableParams) {
    const [data, setData] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            try {
                const response = await apiFetch<TableResponse>(endpoint);

                // Normalize API payload variants into consistent data/total state.
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
    }, [endpoint]);

    return {
        data,
        total,
        loading,
    };
}
