import { FileTextIcon, Loader2 } from 'lucide-react';

import { useApiData } from '@/hooks/use-data';
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
    name: string;
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
    const query = useApiData<MetadataResponse | AppNavigationPage[]>(metadataPath);

    const rawTabs: AppNavigationPage[] = Array.isArray(query.data)
        ? query.data
        : query.data && typeof query.data === 'object'
          ? (query.data as MetadataResponse).tabs ?? (query.data as MetadataResponse).pages ?? []
          : [];

    const tabs = query.isLoading
        ? loadingTabs
        : rawTabs.map((page) => ({
              value: (page as AppNavigationPage).path,
              label: (page as AppNavigationPage).name,
              path: (page as AppNavigationPage).path,
              icon: FileTextIcon,
          }));

    return { tabs };
}
