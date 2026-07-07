import { useCollectionQuery } from '@/hooks/use-collection-query';
import type {
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationStorageResource,
} from '@/lib/types';

/** Fetches database resources for one organization. */
export function useOrganizationDatabaseResources(organizationId: string) {
    const enabled = organizationId.length > 0;

    return useCollectionQuery<ApiOrganizationDatabaseResource>(
        enabled ? `/api/organizations/${organizationId}/database` : null,
        {
            enabled,
        }
    );
}


/** Fetches table previews for one organization database resource. */
export function useOrganizationDatabaseResourceTables(
    organizationId: string,
    resource: ApiOrganizationDatabaseResource | null
) {
    const enabled = organizationId.length > 0 && resource !== null;
    const path = enabled
        ? `/api/organizations/${organizationId}/database/resources/${resource.kind}/${encodeURIComponent(resource.name)}/tables`
        : null;

    return useCollectionQuery<ApiOrganizationDatabaseTable>(path, {
        enabled,
    });
}


/** Fetches storage resources for one organization. */
export function useOrganizationStorageResources(organizationId: string) {
    const enabled = organizationId.length > 0;

    return useCollectionQuery<ApiOrganizationStorageResource>(
        enabled ? `/api/organizations/${organizationId}/storage` : null,
        {
            enabled,
        }
    );
}
