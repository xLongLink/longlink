import { apiQueryKey } from '@/lib/api';
import { platformApiPath } from '@/lib/platform-api';

/** Current user profile query key. */
export const userProfileQueryKey = apiQueryKey(platformApiPath('/me'));

/** Current user's organization memberships query key. */
export const userOrganizationsQueryKey = apiQueryKey(platformApiPath('/me/organizations'));

/** Organizations list query key. */
export const organizationsQueryKey = apiQueryKey(platformApiPath('/organizations'));

/** One organization details query key. */
export function organizationQueryKey(organizationId: string) {
    return apiQueryKey(platformApiPath(`/organizations/${organizationId}`));
}

/** Applications list query key. */
export const applicationsQueryKey = apiQueryKey(platformApiPath('/applications'));

/** Databases list query key. */
export const databasesQueryKey = apiQueryKey(platformApiPath('/databases'));

/** Computes list query key. */
export const computesQueryKey = apiQueryKey(platformApiPath('/computes'));

/** Storages list query key. */
export const storagesQueryKey = apiQueryKey(platformApiPath('/storages'));
