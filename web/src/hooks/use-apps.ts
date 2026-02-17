import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';

export type App = {
    id: number;
    name: string;
    url: string;
};

type CreateAppPayload = {
    name: string;
    url: string;
};

type UseAppsResult = {
    apps: App[];
    isLoading: boolean;
    error: string | null;
    refreshApps: () => Promise<void>;
    createApp: (payload: CreateAppPayload) => Promise<App>;
};

export function useApps(): UseAppsResult {
    const [apps, setApps] = useState<App[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshApps = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch<App[]>('/apps');
            setApps(response);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to load apps'
            );
            setApps([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createApp = useCallback(async (payload: CreateAppPayload) => {
        const app = await apiFetch<App>('/apps', {
            method: 'POST',
            body: payload,
        });
        setApps((previousApps) => [...previousApps, app]);
        return app;
    }, []);

    useEffect(() => {
        void refreshApps();
    }, [refreshApps]);

    return useMemo(
        () => ({
            apps,
            isLoading,
            error,
            refreshApps,
            createApp,
        }),
        [apps, isLoading, error, refreshApps, createApp]
    );
}
