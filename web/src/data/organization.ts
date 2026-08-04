import { useApiQuery } from '@/hooks/use-api';
import {
    zOrganizationDatabaseUsageResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import type { ApiOrganizationDatabaseUsage, ApiOrganizationStorageUsage } from '@/lib/types';

/** Fetches database usage for one organization. */
export function useOrganizationDatabaseUsage(organizationId: string) {
    return useApiQuery<ApiOrganizationDatabaseUsage | null>(
        organizationId ? platformApiPath(`/organizations/${organizationId}/database`) : null,
        {
            parse: (value) => zOrganizationDatabaseUsageResponse.nullable().parse(value),
            retry: false,
        }
    );
}

/** Fetches storage usage for one organization. */
export function useOrganizationStorageUsage(organizationId: string) {
    return useApiQuery<ApiOrganizationStorageUsage | null>(
        organizationId ? platformApiPath(`/organizations/${organizationId}/storage`) : null,
        {
            parse: (value) => zOrganizationStorageUsageResponse.nullable().parse(value),
            retry: false,
        }
    );
}
