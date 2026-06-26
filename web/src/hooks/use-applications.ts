import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiApplicationResponse } from '@/lib/types';

/** Fetches the application list for admin views. */
export function useApplications() {
    return useCollectionQuery<ApiApplicationResponse>('/api/applications', {
        refetchOnMount: 'always',
    });
}
