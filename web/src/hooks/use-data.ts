import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';

type UseDataResult<T> = {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

export function useData<T>(endpoint: string | null): UseDataResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (!endpoint) {
                setData(null);
                return;
            }

            const response = await apiFetch<T>(endpoint);
            setData(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : endpoint
                      ? `Failed to load ${endpoint}`
                      : 'Failed to load data'
            );
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [endpoint]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return useMemo(
        () => ({
            data,
            isLoading,
            error,
            refresh,
        }),
        [data, isLoading, error, refresh]
    );
}
