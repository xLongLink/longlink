import { apiQueryKey } from '@/lib/api';

/** Builds the saved accounts query key. */
export function accountsQueryKey() {
    return apiQueryKey('/api/auth/accounts');
}

/** Builds the current user profile query key. */
export function userProfileQueryKey() {
    return apiQueryKey('/api/me');
}

/** Builds the current user's organization memberships query key. */
export function userOrganizationsQueryKey() {
    return apiQueryKey('/api/me/organizations');
}

/** Builds the organizations list query key. */
export function organizationsQueryKey() {
    return apiQueryKey('/api/organizations');
}

/** Builds the applications list query key. */
export function applicationsQueryKey() {
    return apiQueryKey('/api/applications');
}

/** Builds the databases list query key. */
export function databasesQueryKey() {
    return apiQueryKey('/api/databases');
}

/** Builds the computes list query key. */
export function computesQueryKey() {
    return apiQueryKey('/api/computes');
}

/** Builds the assignable infrastructure options query key. */
export function infrastructureOptionsQueryKey() {
    return apiQueryKey('/api/infrastructure/options');
}

/** Builds the storages list query key. */
export function storagesQueryKey() {
    return apiQueryKey('/api/storages');
}
