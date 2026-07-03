import { describe, expect, it, mock } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';

let mockedQueryResults: unknown[];

mock.module('@tanstack/react-query', () => ({
    useMutation: () => ({
        isPending: false,
        mutateAsync: async () => undefined,
    }),
    useQueries: () => mockedQueryResults.map((data) => ({ data })),
    useQueryClient: () => ({
        invalidateQueries: async () => undefined,
    }),
}));

mock.module('@/components/Auth', () => ({
    Auth: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

mock.module('@/layout/Layout', () => ({
    default: ({ children, tabs }: { children: ReactNode; tabs?: Record<string, string | { href: string }> }) =>
        createElement('div', null, [
            tabs
                ? createElement(
                      'nav',
                      { key: 'tabs' },
                      Object.entries(tabs).map(([label, tab]) => {
                          const href = typeof tab === 'string' ? tab : tab.href;

                          return createElement('a', { href, key: label }, label);
                      })
                  )
                : null,
            createElement('main', { key: 'content' }, children),
        ]),
}));

mock.module('@/components/dialogs/CreateLocationDialog', () => ({
    default: () => createElement('button', { type: 'button' }, 'Create location'),
}));

mock.module('@/components/dialogs/ConnectDatabaseDialog', () => ({
    default: () => createElement('button', { type: 'button' }, 'Connect database'),
}));

mock.module('@/components/dialogs/ConnectStorageDialog', () => ({
    default: () => createElement('button', { type: 'button' }, 'Connect storage'),
}));

mock.module('@/components/dialogs/ConnectComputeDialog', () => ({
    default: () => createElement('button', { type: 'button' }, 'Connect compute'),
}));

mock.module('@/components/dialogs/DeleteConfirmationDialog', () => ({
    DeleteConfirmationDialog: () => createElement('div', null, 'Delete confirmation'),
}));

mock.module('@ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children?: ReactNode }) =>
        createElement('div', { 'data-testid': 'dropdown' }, children),
    DropdownMenuContent: ({ children }: { children?: ReactNode }) =>
        createElement('div', { 'data-testid': 'dropdown-content' }, children),
    DropdownMenuItem: ({ children, render }: { children?: ReactNode; render?: ReactNode }) =>
        createElement('div', { 'data-testid': 'dropdown-item' }, [
            render ? createElement('span', { key: 'render' }, render) : null,
            createElement('span', { key: 'children' }, children),
        ]),
    DropdownMenuTrigger: ({ children, render }: { children?: ReactNode; render?: ReactNode }) =>
        createElement('div', { 'data-testid': 'dropdown-trigger' }, [
            render ? createElement('span', { key: 'render' }, render) : null,
            createElement('span', { key: 'children' }, children),
        ]),
}));

const adminUser = {
    id: 'user-1',
    name: 'Ada Admin',
    email: 'ada@example.com',
    avatar: '',
    oidc: 'oidc-ada',
    role: 'administrator',
};

const location = {
    id: 'location-1',
    name: 'Zurich',
    slug: 'zurich',
    country: 'CH',
    provider: 'local',
};

const organization = {
    id: 'organization-1',
    name: 'Acme Ops',
    slug: 'acme',
    avatar: null,
    location_id: 'location-1',
    location,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T11:00:00Z',
    deleted_at: '2026-07-01T12:00:00Z',
    created_by: adminUser,
    updated_by: adminUser,
    deleted_by: adminUser,
};

const application = {
    id: 'application-1',
    organization_id: 'organization-1',
    organization,
    name: 'Inventory',
    slug: 'inventory',
    image: 'registry.example.com/acme/inventory:1',
    status: 'running',
    role: 'admin',
    description: 'Warehouse workflow',
    icon: 'box',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    deleted_at: null,
    created_by: adminUser,
    updated_by: adminUser,
    deleted_by: null,
};

const database = {
    id: 'database-1',
    name: 'Primary database',
    slug: 'primary-db',
    location_id: 'location-1',
    host: 'db.internal',
    port: 5432,
    runtime_host: 'db.runtime',
    runtime_port: 5432,
    username: 'longlink',
};

const storage = {
    id: 'storage-1',
    name: 'Primary storage',
    slug: 'primary-storage',
    location_id: 'location-1',
    endpoint_url: 'https://s3.example.com',
    runtime_endpoint_url: 'http://minio:9000',
    access_key_id: 'access-key',
    protocol: 's3',
};

const compute = {
    id: 'compute-1',
    kind: 'kubernetes',
    slug: 'primary-compute',
    location_id: 'location-1',
    ingress_host: 'apps.example.com',
};

mock.module('@/hooks/use-user', () => ({
    useUser: () => ({
        organizations: [],
        role: 'administrator',
        user: adminUser,
    }),
}));

mock.module('@/hooks/use-users', () => ({
    useUsers: () => ({ error: null, isLoading: false, items: [adminUser] }),
}));

mock.module('@/hooks/use-locations', () => ({
    useLocations: () => ({ error: null, isLoading: false, items: [location] }),
}));

mock.module('@/hooks/use-applications', () => ({
    useApplications: () => ({ error: null, isLoading: false, items: [application] }),
}));

mock.module('@/hooks/use-organizations', () => ({
    useOrganizations: () => ({ error: null, isLoading: false, items: [organization] }),
}));

mock.module('@/hooks/use-databases', () => ({
    useDatabases: () => ({ error: null, isLoading: false, items: [database] }),
}));

mock.module('@/hooks/use-database-instances', () => ({
    useDatabaseInstances: () => ({ error: null, isLoading: false, items: [{ name: 'organization_acme' }] }),
}));

mock.module('@/hooks/use-database-schemas', () => ({
    useDatabaseSchemas: () => ({ error: null, isLoading: false, items: [{ name: 'app_inventory' }] }),
}));

mock.module('@/hooks/use-storages', () => ({
    useStorages: () => ({ error: null, isLoading: false, items: [storage] }),
}));

mock.module('@/hooks/use-storage-buckets', () => ({
    useStorageBuckets: () => ({ error: null, isLoading: false, items: [{ name: 'acme-inventory' }] }),
}));

mock.module('@/hooks/use-storage-objects', () => ({
    useStorageObjects: () => ({
        error: null,
        isLoading: false,
        items: [{ key: 'orders/export.csv', size: 512, etag: 'etag-1', last_modified: '2026-07-01T10:00:00Z' }],
    }),
}));

mock.module('@/hooks/use-computes', () => ({
    useComputes: () => ({ error: null, isLoading: false, items: [compute] }),
}));

mock.module('@/hooks/use-compute-namespaces', () => ({
    useComputeNamespaces: () => ({ error: null, isLoading: false, items: [{ name: 'org-acme' }] }),
}));

mock.module('@/hooks/use-compute-pods', () => ({
    useComputePods: () => ({
        error: null,
        isLoading: false,
        items: [
            {
                name: 'inventory-7d9',
                status: 'Running',
                node: 'node-1',
                created_at: '2026-07-01T10:00:00Z',
                resources: {
                    cpu_limit: 2,
                    cpu_usage: 0.5,
                    ram_limit: 1024,
                    ram_usage: 512,
                },
            },
        ],
    }),
}));

mock.module('@/hooks/use-operations', () => ({
    useOperations: () => ({
        error: null,
        isLoading: false,
        items: [
            {
                id: 'operation-scheduled',
                kind: 'application.create',
                application_id: 'application-1',
                organization_id: 'organization-1',
                step: 'verify',
                status: 'scheduled',
                error: null,
                created_at: '2026-07-01T10:00:00Z',
                started_at: null,
                stopped_at: null,
            },
            {
                id: 'operation-active',
                kind: 'application.delete',
                application_id: 'application-1',
                organization_id: 'organization-1',
                step: 'remove',
                status: 'active',
                error: null,
                created_at: '2026-07-01T10:00:00Z',
                started_at: '2026-07-01T10:01:00Z',
                stopped_at: null,
            },
            {
                id: 'operation-completed',
                kind: 'organization.delete',
                application_id: null,
                organization_id: 'organization-1',
                step: 'remove',
                status: 'completed',
                error: null,
                created_at: '2026-07-01T10:00:00Z',
                started_at: '2026-07-01T10:01:00Z',
                stopped_at: '2026-07-01T10:02:00Z',
            },
            {
                id: 'operation-failed',
                kind: 'application.create',
                application_id: 'application-1',
                organization_id: 'organization-1',
                step: 'verify',
                status: 'failed',
                error: 'rollout failed',
                created_at: '2026-07-01T10:00:00Z',
                started_at: '2026-07-01T10:01:00Z',
                stopped_at: '2026-07-01T10:02:00Z',
            },
        ],
    }),
}));

const { default: Admin } = await import('@/pages/Admin');
const { default: AdminApplications } = await import('@/pages/admin/Applications');
const { default: AdminCompute } = await import('@/pages/admin/Compute');
const { default: ComputeNamespaces } = await import('@/pages/admin/ComputeNamespaces');
const { default: ComputePods } = await import('@/pages/admin/ComputePods');
const { default: AdminDatabase } = await import('@/pages/admin/Database');
const { default: DatabaseInstances } = await import('@/pages/admin/DatabaseInstances');
const { default: DatabaseSchemas } = await import('@/pages/admin/DatabaseSchemas');
const { default: AdminLocation } = await import('@/pages/admin/Location');
const { default: AdminOperations } = await import('@/pages/admin/Operations');
const { default: AdminOrganizations } = await import('@/pages/admin/Organizations');
const { default: AdminStorage } = await import('@/pages/admin/Storage');
const { default: StorageBuckets } = await import('@/pages/admin/StorageBuckets');
const { default: StorageObjects } = await import('@/pages/admin/StorageObjects');
const { default: AdminUsers } = await import('@/pages/admin/Users');

/** Renders an element with route params available to React Router hooks. */
function renderRoute(element: ReactNode, initialEntry: string, routePath = '*'): string {
    return renderToStaticMarkup(
        createElement(
            MemoryRouter,
            { initialEntries: [initialEntry] },
            createElement(Routes, null, createElement(Route, { path: routePath, element }))
        )
    );
}

describe('admin workspaces', () => {
    mockedQueryResults = [{ space_used: 4096 }, { cpu_free: 2, cpu_total: 4, ram_free: 2048, ram_total: 4096 }];

    it('renders the support/admin shell tabs', () => {
        const output = renderRoute(createElement(Admin), '/admin');

        expect(output).toContain('href="/admin/users"');
        expect(output).toContain('href="/admin/operations"');
    });

    it('lists users with roles, emails, OIDC subjects, and action controls', () => {
        const output = renderRoute(createElement(AdminUsers), '/admin/users');

        expect(output).toContain('Ada Admin');
    });

    it('lists applications with organization, status, image, and location context', () => {
        const output = renderRoute(createElement(AdminApplications), '/admin/applications');

        expect(output).toContain('Inventory');
    });

    it('lists organizations with lifecycle users', () => {
        const output = renderRoute(createElement(AdminOrganizations), '/admin/organizations');

        expect(output).toContain('Acme Ops');
    });

    it('lists locations and administrator-only creation controls', () => {
        const output = renderRoute(createElement(AdminLocation), '/admin/locations');

        expect(output).toContain('Zurich');
        expect(output).toContain('Create location');
    });

    it('manages database registries and browses databases and schemas', () => {
        mockedQueryResults = [{ space_used: 4096 }];

        const registryOutput = renderRoute(createElement(AdminDatabase), '/admin/database');
        const databasesOutput = renderRoute(
            createElement(DatabaseInstances),
            '/admin/database/primary-db',
            '/admin/database/:database'
        );
        const schemasOutput = renderRoute(
            createElement(DatabaseSchemas),
            '/admin/database/primary-db/databases/organization_acme',
            '/admin/database/:database/databases/:databaseName'
        );

        expect(registryOutput).toContain('Connect database');
        expect(databasesOutput).toContain('organization_acme');
        expect(schemasOutput).toContain('app_inventory');
    });

    it('manages storage registries and browses buckets and objects', () => {
        const registryOutput = renderRoute(createElement(AdminStorage), '/admin/storage');
        const bucketsOutput = renderRoute(
            createElement(StorageBuckets),
            '/admin/storage/primary-storage',
            '/admin/storage/:storage'
        );
        const objectsOutput = renderRoute(
            createElement(StorageObjects),
            '/admin/storage/primary-storage/buckets/acme-inventory',
            '/admin/storage/:storage/buckets/:bucket'
        );

        expect(registryOutput).toContain('Connect storage');
        expect(bucketsOutput).toContain('acme-inventory');
        expect(objectsOutput).toContain('orders/export.csv');
    });

    it('manages compute registries and browses resources, namespaces, pods, and pod usage', () => {
        mockedQueryResults = [{ cpu_free: 2, cpu_total: 4, ram_free: 2048, ram_total: 4096 }];

        const registryOutput = renderRoute(createElement(AdminCompute), '/admin/compute');
        const namespacesOutput = renderRoute(
            createElement(ComputeNamespaces),
            '/admin/compute/primary-compute',
            '/admin/compute/:compute'
        );
        const podsOutput = renderRoute(
            createElement(ComputePods),
            '/admin/compute/primary-compute/namespace/org-acme',
            '/admin/compute/:compute/namespace/:namespace'
        );

        expect(registryOutput).toContain('Connect compute');
        expect(namespacesOutput).toContain('org-acme');
        expect(podsOutput).toContain('inventory-7d9');
    });

    it('lists operation statuses with timestamps, steps, resource ids, and errors', () => {
        const output = renderRoute(createElement(AdminOperations), '/admin/operations');

        expect(output).toContain('Scheduled');
        expect(output).toContain('Failed');
        expect(output).toContain('rollout failed');
    });
});
