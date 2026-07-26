import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiOrganizationDatabaseResourceSchema,
    apiOrganizationStorageResourceSchema,
    parseApiCollection,
} from '@/lib/api-schemas';
import type { ApiOrganizationDatabaseResource, ApiOrganizationStorageResource } from '@/lib/types';

/** Fetches database resources for one organization. */
export function useOrganizationDatabaseResources(organizationId: string) {
    const enabled = organizationId.length > 0;

    return useCollectionQuery<ApiOrganizationDatabaseResource>(
        enabled ? `/api/organizations/${organizationId}/database` : null,
        {
            enabled,
            parse: (value) => parseApiCollection(apiOrganizationDatabaseResourceSchema, value),
        }
    );
}

/** Fetches storage resources for one organization. */
export function useOrganizationStorageResources(organizationId: string) {
    const enabled = organizationId.length > 0;

    return useCollectionQuery<ApiOrganizationStorageResource>(
        enabled ? `/api/organizations/${organizationId}/storage` : null,
        {
            enabled,
            parse: (value) => parseApiCollection(apiOrganizationStorageResourceSchema, value),
        }
    );
}
