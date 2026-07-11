import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiApplicationResponseSchema,
    apiCountryOptionSchema,
    apiLocationSchema,
    apiOperationSchema,
    apiOrganizationSummarySchema,
    apiUserListItemSchema,
    parseApiCollection,
} from '@/lib/api-schemas';
import type {
    ApiApplicationResponse,
    ApiCountryOption,
    ApiLocation,
    ApiOperation,
    ApiOrganizationSummary,
    ApiUserListItem,
} from '@/lib/types';

/** Fetches the application list for admin views. */
export function useApplications() {
    return useCollectionQuery<ApiApplicationResponse>('/api/applications', {
        parse: (value) => parseApiCollection(apiApplicationResponseSchema, value),
    });
}

/** Fetches the shared location list for selectors and admin views. */
export function useLocations(enabled = true) {
    return useCollectionQuery<ApiLocation>(enabled ? '/api/locations' : null, {
        enabled,
        parse: (value) => parseApiCollection(apiLocationSchema, value),
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
