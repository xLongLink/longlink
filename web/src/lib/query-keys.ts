import { apiQueryKey } from '@/lib/api';

/** Builds the operations list query key. */
export function operationsQueryKey() {
    return apiQueryKey('/api/operations');
}

/** Builds the locations list query key. */
export function locationsQueryKey() {
    return apiQueryKey('/api/locations');
}

/** Builds the users list query key. */
export function usersQueryKey() {
    return apiQueryKey('/api/users');
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

/** Builds the database instances query key. */
export function databaseInstancesQueryKey(databaseId: string) {
    return apiQueryKey(`/api/databases/${databaseId}/databases`);
}

/** Builds the database schemas query key. */
export function databaseSchemasQueryKey(databaseId: string, databaseName: string) {
    return apiQueryKey(`/api/databases/${databaseId}/databases/${encodeURIComponent(databaseName)}/schemas`);
}

/** Builds the compute namespaces query key. */
export function computeNamespacesQueryKey(computeId: string) {
    return apiQueryKey(`/api/computes/${computeId}/namespaces`);
}

/** Builds the compute pods query key. */
export function computePodsQueryKey(computeId: string, namespace: string) {
    return apiQueryKey(`/api/computes/${computeId}/namespaces/${encodeURIComponent(namespace)}/pods`);
}
