import { useApiQuery } from '@/hooks/use-api';
import type {
    OrganizationDatabaseUsageResponse,
    OrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/types.gen';
import {
    zOrganizationDatabaseUsageResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';

/** Fetches database usage for one organization. */
export function useOrganizationDatabaseUsage(organizationId: string) {
    return useApiQuery<OrganizationDatabaseUsageResponse | null>(
        organizationId ? platformApiPath(`/organizations/${organizationId}/database`) : null,
        {
            parse: (value) => zOrganizationDatabaseUsageResponse.nullable().parse(value),
            retry: false,
        }
    );
}

/** Fetches storage usage for one organization. */
export function useOrganizationStorageUsage(organizationId: string) {
    return useApiQuery<OrganizationStorageUsageResponse | null>(
        organizationId ? platformApiPath(`/organizations/${organizationId}/storage`) : null,
        {
            parse: (value) => zOrganizationStorageUsageResponse.nullable().parse(value),
            retry: false,
        }
    );
}
