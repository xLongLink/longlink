import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiOrganizationSummary } from '@/lib/types';

/** Fetches the organization list for admin views. */
export function useOrganizations() {
    return useCollectionQuery<ApiOrganizationSummary>('/api/organizations', {
        refetchOnMount: 'always',
    });
}
