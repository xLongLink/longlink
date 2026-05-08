import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { getAppTabsFromPages, type AppNavigationPage, type NavigationTab } from '@/lib/navigation';

type MetadataResponse = {
    tabs?: unknown;
    pages?: unknown;
};

const loadingTabs: NavigationTab[] = [
    {
        value: 'loading',
        label: 'Loading',
        path: '',
        icon: Loader2,
    },
];

/**
 * Fetches a metadata document and returns its tabs payload.
 */
export function useTabs(metadataPath: string | null) {
    const query = useQuery({
        queryKey: ['tabs', metadataPath],
        queryFn: () => apiFetch<MetadataResponse | unknown[]>(metadataPath!),
        enabled: Boolean(metadataPath),
    });

    const rawTabs = Array.isArray(query.data)
        ? query.data
        : query.data && typeof query.data === 'object'
          ? ((query.data as MetadataResponse).tabs ?? (query.data as MetadataResponse).pages ?? [])
          : [];

    const tabs = query.isLoading
        ? loadingTabs
        : getAppTabsFromPages(
              rawTabs.map((page) => ({
                  ...(page as AppNavigationPage),
                  icon: (page as AppNavigationPage).icon ?? 'file-text',
              }))
          );

    return { tabs };
}
