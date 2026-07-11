import type {
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationDatabaseTableRows,
    ApiOrganizationStorageResource,
} from '@/lib/types';
import { useApiQuery } from '@/hooks/use-api';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiOrganizationDatabaseResourceSchema,
    apiOrganizationDatabaseTableRowsSchema,
    apiOrganizationDatabaseTableSchema,
    apiOrganizationStorageResourceSchema,
    parseApiCollection,
    parseApiResponse,
} from '@/lib/api-schemas';

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

/** Fetches table columns for one organization database resource. */
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
        parse: (value) => parseApiCollection(apiOrganizationDatabaseTableSchema, value),
    });
}

/** Fetches preview rows for one organization database table. */
export function useOrganizationDatabaseTableRows(
    organizationId: string,
    resource: ApiOrganizationDatabaseResource | null,
    tableName: string
) {
    const enabled = organizationId.length > 0 && resource !== null && tableName.length > 0;
    const path = enabled
        ? `/api/organizations/${organizationId}/database/resources/${resource.kind}/${encodeURIComponent(resource.name)}/tables/${encodeURIComponent(tableName)}/rows`
        : null;

    return useApiQuery<ApiOrganizationDatabaseTableRows>(path, {
        enabled,
        parse: (value) => parseApiResponse(apiOrganizationDatabaseTableRowsSchema, value),
    });
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
