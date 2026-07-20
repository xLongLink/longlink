import type {
    ApiApplicationResponse,
    ApiCountryOption,
    ApiInfrastructureOptions,
    ApiOperation,
    ApiOrganizationSummary,
    ApiUserListItem,
} from '@/lib/types';
import { useApiQuery } from '@/hooks/use-api';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiApplicationResponseSchema,
    apiCountryOptionSchema,
    apiInfrastructureOptionsSchema,
    apiOperationSchema,
    apiOrganizationSummarySchema,
    apiUserListItemSchema,
    parseApiCollection,
    parseApiResponse,
} from '@/lib/api-schemas';

/** Fetches assignable infrastructure identities without connection secrets. */
export function useInfrastructureOptions(enabled = true) {
    return useApiQuery<ApiInfrastructureOptions>(enabled ? '/api/infrastructure/options' : null, {
        enabled,
        refetchInterval: enabled ? 5000 : false,
        parse: (value) => parseApiResponse(apiInfrastructureOptionsSchema, value),
    });
}

/** Fetches the application list for admin views. */
export function useApplications() {
    return useCollectionQuery<ApiApplicationResponse>('/api/applications', {
        parse: (value) => parseApiCollection(apiApplicationResponseSchema, value),
    });
}

/** Fetches ISO country options for selectors. */
export function useCountries(enabled = true) {
    return useCollectionQuery<ApiCountryOption>(enabled ? '/api/countries' : null, {
        enabled,
        parse: (value) => parseApiCollection(apiCountryOptionSchema, value),
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
