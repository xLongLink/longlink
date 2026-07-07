import { useCollectionQuery } from '@/hooks/use-collection-query';
import type {
    ApiApplicationResponse,
    ApiLocation,
    ApiOperation,
    ApiOrganizationSummary,
    ApiUserSummary,
} from '@/lib/types';

/** Fetches the application list for admin views. */
export function useApplications() {
    return useCollectionQuery<ApiApplicationResponse>('/api/applications');
}


/** Fetches the shared location list for selectors and admin views. */
export function useLocations(enabled = true) {
    return useCollectionQuery<ApiLocation>(enabled ? '/api/locations' : null, {
        enabled,
    });
}


/** Fetches the operation list for admin views. */
export function useOperations() {
    return useCollectionQuery<ApiOperation>('/api/operations');
}


/** Fetches the organization list for admin views. */
export function useOrganizations() {
    return useCollectionQuery<ApiOrganizationSummary>('/api/organizations');
}


/** Fetches the full user list for admin views. */
export function useUsers() {
    return useCollectionQuery<ApiUserSummary>('/api/users');
}
