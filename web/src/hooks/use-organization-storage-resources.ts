import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiOrganizationStorageResource } from '@/lib/types';

/** Fetches storage resources for one organization. */
export function useOrganizationStorageResources(organizationId: string) {
    return useCollectionQuery<ApiOrganizationStorageResource>(
        organizationId ? `/api/organizations/${organizationId}/storage` : null,
        {
            enabled: organizationId.length > 0,
            refetchOnMount: 'always',
        }
    );
}
