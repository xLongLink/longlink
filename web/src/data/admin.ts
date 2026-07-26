import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiApplicationResponseSchema,
    apiOperationSchema,
    apiOrganizationSummarySchema,
    apiUserListItemSchema,
    parseApiCollection,
} from '@/lib/api-schemas';
import type { ApiApplicationResponse, ApiOperation, ApiOrganizationSummary, ApiUserListItem } from '@/lib/types';

/** Fetches the application list for admin views. */
export function useApplications() {
    return useCollectionQuery<ApiApplicationResponse>('/api/applications', {
        parse: (value) => parseApiCollection(apiApplicationResponseSchema, value),
    });
}

/** Fetches the operation list for admin views. */
export function useOperations() {
    return useCollectionQuery<ApiOperation>('/api/operations', {
        refetchInterval: 5000,
        parse: (value) => parseApiCollection(apiOperationSchema, value),
    });
}

/** Fetches the organization list for admin views. */
export function useOrganizations() {
    return useCollectionQuery<ApiOrganizationSummary>('/api/organizations', {
        parse: (value) => parseApiCollection(apiOrganizationSummarySchema, value),
    });
}

/** Fetches the full user list for admin views. */
export function useUsers() {
    return useCollectionQuery<ApiUserListItem>('/api/users', {
        parse: (value) => parseApiCollection(apiUserListItemSchema, value),
    });
}
