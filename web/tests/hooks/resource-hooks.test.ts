import { useApiQuery } from '@/hooks/use-api';
import { useApplications } from '@/hooks/use-applications';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useComputeNamespaces } from '@/hooks/use-compute-namespaces';
import { useComputePods } from '@/hooks/use-compute-pods';
import { useComputes } from '@/hooks/use-computes';
import { useDatabaseInstances } from '@/hooks/use-database-instances';
import { useDatabaseSchemas } from '@/hooks/use-database-schemas';
import { useDatabases } from '@/hooks/use-databases';
import { useLocations } from '@/hooks/use-locations';
import { useMetadata } from '@/hooks/use-metadata';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOperations } from '@/hooks/use-operations';
import {
    resolveOrganizationId,
    useCreateOrganization,
    useDeleteOrganization,
    useOrganization,
    useOrganizationActions,
} from '@/hooks/use-organization';
import { useOrganizationDatabaseResourceTables } from '@/hooks/use-organization-database-resource-tables';
import { useOrganizationDatabaseResources } from '@/hooks/use-organization-database-resources';
import { useOrganizationStorageResources } from '@/hooks/use-organization-storage-resources';
import { useOrganizations } from '@/hooks/use-organizations';
import { useSdkUser } from '@/hooks/use-sdk-user';
import { useStorageBuckets } from '@/hooks/use-storage-buckets';
import { useStorageObjects } from '@/hooks/use-storage-objects';
import { useStorages } from '@/hooks/use-storages';
import { useUpdateUser, useUser } from '@/hooks/use-user';
import { useUsers } from '@/hooks/use-users';
import {
    accountsQueryKey,
    applicationsQueryKey,
    computeResourcesQueryKey,
    computesQueryKey,
    databaseUsageQueryKey,
    databasesQueryKey,
    locationsQueryKey,
    organizationsQueryKey,
    storagesQueryKey,
} from '@/lib/query-keys';
import { describe, expect, it } from 'bun:test';

describe('web hook catalog', () => {
    it('exports shared query, auth, SDK user, mutation, and resource hooks', () => {
        const hooks = [
            useApiQuery,
            useCollectionQuery,
            useUser,
            useUpdateUser,
            useSdkUser,
            useOrganization,
            useOrganizationActions,
            useCreateOrganization,
            useDeleteOrganization,
            useApplications,
            useOrganizations,
            useUsers,
            useLocations,
            useDatabases,
            useDatabaseInstances,
            useDatabaseSchemas,
            useStorages,
            useStorageBuckets,
            useStorageObjects,
            useComputes,
            useComputeNamespaces,
            useComputePods,
            useOperations,
            useMetadata,
            useOrganizationDatabaseResources,
            useOrganizationDatabaseResourceTables,
            useOrganizationStorageResources,
            useIsMobile,
        ];

        expect(hooks.every((hook) => typeof hook === 'function')).toBe(true);
    });

    it('resolves organization slugs and provides stable resource query keys', () => {
        expect(resolveOrganizationId('acme', [{ id: 'organization-1', slug: 'acme' } as never])).toBe('organization-1');
        expect(resolveOrganizationId('missing', [{ id: 'organization-1', slug: 'acme' } as never])).toBe('');
        expect(locationsQueryKey()).toEqual(['api', '/api/locations']);
        expect(accountsQueryKey()).toEqual(['api', '/auth/accounts']);
        expect(organizationsQueryKey()).toEqual(['api', '/api/organizations']);
        expect(applicationsQueryKey()).toEqual(['api', '/api/applications']);
        expect(databasesQueryKey()).toEqual(['api', '/api/databases']);
        expect(databaseUsageQueryKey('database-1')).toEqual(['api', '/api/databases/database-1/usage']);
        expect(computesQueryKey()).toEqual(['api', '/api/computes']);
        expect(computeResourcesQueryKey('compute-1')).toEqual(['api', '/api/computes/compute-1/resources']);
        expect(storagesQueryKey()).toEqual(['api', '/api/storages']);
    });
});
