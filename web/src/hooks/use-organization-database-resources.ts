import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiOrganizationDatabaseResource } from '@/lib/types';

/** Fetches database resources for one organization. */
export function useOrganizationDatabaseResources(organizationId: string) {
    return useCollectionQuery<ApiOrganizationDatabaseResource>(
        organizationId ? `/api/organizations/${organizationId}/database` : null,
        {
            enabled: organizationId.length > 0,
            refetchOnMount: 'always',
        }
    );
}
