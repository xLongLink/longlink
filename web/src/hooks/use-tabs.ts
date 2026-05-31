import { useQuery } from '@tanstack/react-query';
import { FileTextIcon, Loader2 } from 'lucide-react';

import { fetchApiJson } from '@/lib/api';
import type { ComponentType } from 'react';

type MetadataResponse = {
    tabs?: AppNavigationPage[];
    pages?: AppNavigationPage[];
};

export type NavigationTab = {
    value: string;
    label: string;
    path?: string;
    icon: ComponentType<{ className?: string }>;
};

type AppNavigationPage = {
    path: string;
    icon?: string;
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
        queryKey: ['api', metadataPath],
        queryFn: async () =>
            fetchApiJson<MetadataResponse | AppNavigationPage[]>(metadataPath!, { credentials: 'include' }),
        enabled: Boolean(metadataPath),
    });

    const rawTabs: AppNavigationPage[] = Array.isArray(query.data)
        ? query.data
        : query.data && typeof query.data === 'object'
          ? ((query.data as MetadataResponse).tabs ?? (query.data as MetadataResponse).pages ?? [])
          : [];

    const tabs = query.isLoading
        ? loadingTabs
        : rawTabs.map((page) => ({
              value: (page as AppNavigationPage).path.replace(/\.xml$/i, ''),
              label: (page as AppNavigationPage).path.replace(/\.xml$/i, ''),
              path: (page as AppNavigationPage).path,
              icon: FileTextIcon,
          }));

    return { tabs };
}
