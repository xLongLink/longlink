import { apiQueryKey } from '@/lib/api';

/** Builds the locations list query key. */
export function locationsQueryKey() {
    return apiQueryKey('/api/locations');
}

/** Builds the saved accounts query key. */
export function accountsQueryKey() {
    return apiQueryKey('/auth/accounts');
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

/** Builds the database usage query key. */
export function databaseUsageQueryKey(databaseId: string) {
    return apiQueryKey(`/api/databases/${databaseId}/usage`);
}

/** Builds the computes list query key. */
export function computesQueryKey() {
    return apiQueryKey('/api/computes');
}

/** Builds the compute resources query key. */
export function computeResourcesQueryKey(computeId: string) {
    return apiQueryKey(`/api/computes/${computeId}/resources`);
}

/** Builds the storages list query key. */
export function storagesQueryKey() {
    return apiQueryKey('/api/storages');
}
