import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiOrganizationDatabaseResource, ApiOrganizationDatabaseTable } from '@/lib/types';

/** Fetches table previews for one organization database resource. */
export function useOrganizationDatabaseResourceTables(
    organizationId: string,
    resource: ApiOrganizationDatabaseResource | null
) {
    const path =
        organizationId && resource
            ? `/api/organizations/${organizationId}/database/resources/${resource.kind}/${encodeURIComponent(resource.name)}/tables`
            : null;

    return useCollectionQuery<ApiOrganizationDatabaseTable>(path, {
        enabled: organizationId.length > 0 && resource !== null,
        refetchOnMount: 'always',
    });
}
