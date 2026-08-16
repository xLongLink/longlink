import { apiQueryKey } from '@/lib/api';

/** Current user profile query key. */
export const userProfileQueryKey = apiQueryKey('/api/v1/me');

/** Current user's organization memberships query key. */
export const userOrganizationsQueryKey = apiQueryKey('/api/v1/me/organizations');

/** Organizations list query key. */
export const organizationsQueryKey = apiQueryKey('/api/v1/organizations');

/** One organization details query key. */
export function organizationQueryKey(organizationId: string) {
    return apiQueryKey(`/api/v1/organizations/${organizationId}`);
}

/** Applications list query key. */
export const applicationsQueryKey = apiQueryKey('/api/v1/applications');

/** Databases list query key. */
export const databasesQueryKey = apiQueryKey('/api/v1/databases');

/** Computes list query key. */
export const computesQueryKey = apiQueryKey('/api/v1/computes');

/** Storages list query key. */
export const storagesQueryKey = apiQueryKey('/api/v1/storages');
