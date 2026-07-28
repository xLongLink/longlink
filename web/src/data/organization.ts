import { useApiQuery } from '@/hooks/use-api';
import {
    apiOrganizationDatabaseUsageSchema,
    apiOrganizationStorageUsageSchema,
    parseApiResponse,
} from '@/lib/api-schemas';
import type { ApiOrganizationDatabaseUsage, ApiOrganizationStorageUsage } from '@/lib/types';

/** Fetches database usage for one organization. */
export function useOrganizationDatabaseUsage(organizationId: string) {
    return useApiQuery<ApiOrganizationDatabaseUsage | null>(
        organizationId ? `/api/organizations/${organizationId}/database` : null,
        {
            parse: (value) => parseApiResponse(apiOrganizationDatabaseUsageSchema.nullable(), value),
            retry: false,
        }
    );
}

/** Fetches storage usage for one organization. */
export function useOrganizationStorageUsage(organizationId: string) {
    return useApiQuery<ApiOrganizationStorageUsage | null>(
        organizationId ? `/api/organizations/${organizationId}/storage` : null,
        {
            parse: (value) => parseApiResponse(apiOrganizationStorageUsageSchema.nullable(), value),
            retry: false,
        }
    );
}
