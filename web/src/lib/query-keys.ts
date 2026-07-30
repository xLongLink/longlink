import { apiQueryKey } from '@/lib/api';

/** Current user profile query key. */
export const userProfileQueryKey = apiQueryKey('/api/me');

/** Current user's organization memberships query key. */
export const userOrganizationsQueryKey = apiQueryKey('/api/me/organizations');

/** Organizations list query key. */
export const organizationsQueryKey = apiQueryKey('/api/organizations');

/** Applications list query key. */
export const applicationsQueryKey = apiQueryKey('/api/applications');

/** Databases list query key. */
export const databasesQueryKey = apiQueryKey('/api/databases');

/** Computes list query key. */
export const computesQueryKey = apiQueryKey('/api/computes');

/** Storages list query key. */
export const storagesQueryKey = apiQueryKey('/api/storages');
