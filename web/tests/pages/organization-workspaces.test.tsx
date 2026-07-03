import { describe, expect, it, mock } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';

let mockedUserState: Record<string, unknown>;
let mockedOrganizationState: Record<string, unknown>;
let mockedOrganizationActions: Record<string, unknown>;
let mockedDatabaseResources: unknown[];
let mockedDatabaseTables: unknown[];
let mockedStorageResources: unknown[];

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

mock.module('@/components/SignInCard', () => ({
    SignInCard: ({ redirectTo }: { redirectTo: string }) => createElement('div', null, `sign-in ${redirectTo}`),
}));

mock.module('@/components/dialogs/CreateOrganizationDialog', () => ({
    default: () => createElement('button', { type: 'button' }, 'Create organization'),
}));

mock.module('@/components/dialogs/CreateApplicationDialog', () => ({
    default: () => createElement('button', { type: 'button' }, 'Create application'),
}));

mock.module('@/components/dialogs/DeleteConfirmationDialog', () => ({
    DeleteConfirmationDialog: () => createElement('div', null, 'Delete confirmation'),
}));

mock.module('@/components/dialogs/LogsDialog', () => ({
    default: ({ applicationName }: { applicationName: string }) =>
        createElement('div', null, `Logs ${applicationName}`),
}));

mock.module('@/hooks/use-user', () => ({
    useUpdateUser: () => ({ isPending: false, mutateAsync: async () => undefined }),
    useUser: () => mockedUserState,
}));

mock.module('@/hooks/use-organization', () => ({
    useDeleteOrganization: () => ({ isPending: false, mutateAsync: async () => undefined }),
    useOrganization: () => mockedOrganizationState,
    useOrganizationActions: () => mockedOrganizationActions,
}));

mock.module('@/hooks/use-organization-database-resources', () => ({
    useOrganizationDatabaseResources: () => ({
        error: null,
        isLoading: false,
        items: mockedDatabaseResources,
    }),
}));

mock.module('@/hooks/use-organization-database-resource-tables', () => ({
    useOrganizationDatabaseResourceTables: () => ({
        error: null,
        isLoading: false,
        items: mockedDatabaseTables,
    }),
}));

mock.module('@/hooks/use-organization-storage-resources', () => ({
    useOrganizationStorageResources: () => ({
        error: null,
        isLoading: false,
        items: mockedStorageResources,
    }),
}));

const { default: Organization } = await import('@/pages/Organization');
const { default: Organizations } = await import('@/pages/Organizations');
const { default: Settings } = await import('@/pages/Settings');
const { default: OrganizationDatabase } = await import('@/pages/org/Database');
const { default: People } = await import('@/pages/org/People');
const { default: OrganizationSettings } = await import('@/pages/org/Settings');
const { default: OrganizationStorage } = await import('@/pages/org/Storage');

const location = {
    id: 'location-1',
    name: 'Zurich',
    slug: 'zurich',
    country: 'CH',
    provider: 'local',
};

const user = {
    id: 'user-1',
    name: 'Sau User',
    email: 'sau@example.com',
    avatar: '',
    oidc: 'oidc-sau',
    role: 'administrator' as const,
};

const organizationMembership = {
    id: 'organization-1',
    name: 'Acme Ops',
    slug: 'acme',
    avatar: '',
    role: 'owner' as const,
    location,
};

const application = {
    id: 'application-1',
    name: 'Inventory',
    slug: 'inventory',
    description: 'Warehouse workflow',
    icon: 'box' as const,
    status: 'running' as const,
    image: 'registry.example.com/acme/inventory:1',
    role: 'admin' as const,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    deleted_at: null,
    organization_id: 'organization-1',
    organization: organizationMembership,
    created_by: user,
    updated_by: user,
    deleted_by: null,
};

const organizationDetails = {
    ...organizationMembership,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    created_by: user,
    deleted_at: null,
    deleted_by: null,
    location_id: location.id,
    updated_by: user,
    applications: [application],
    invitations: [],
    users: [],
};

const member = {
    id: 'member-1',
    name: 'Maintainer User',
    email: 'maintainer@example.com',
    avatar: '',
    role: 'maintain' as const,
};

const invitation = {
    id: 'invitation-1',
    email: 'new@example.com',
    role: 'write' as const,
    created_at: '2026-07-01T12:00:00Z',
};

/** Renders an element with route params available to React Router hooks. */
function renderRoute(element: ReactNode, initialEntry: string, routePath: string): string {
    return renderToStaticMarkup(
        createElement(
            MemoryRouter,
            { initialEntries: [initialEntry] },
            createElement(Routes, null, createElement(Route, { path: routePath, element }))
        )
    );
}

/** Renders an element while exposing a URL hash to hash-aware menu components. */
function renderWithHash(element: ReactNode, initialEntry: string, hash: string): string {
    const previousWindow = typeof window === 'undefined' ? undefined : window;
    const testWindow = {
        addEventListener: () => undefined,
        history: {
            replaceState: () => undefined,
            state: null,
        },
        location: {
            hash,
            pathname: initialEntry,
            search: '',
        },
        removeEventListener: () => undefined,
    } as unknown as Window & typeof globalThis;

    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: testWindow,
    });

    try {
        return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [initialEntry] }, element));
    } finally {
        if (previousWindow) {
            Object.defineProperty(globalThis, 'window', {
                configurable: true,
                value: previousWindow,
            });
        } else {
            Reflect.deleteProperty(globalThis, 'window');
        }
    }
}

describe('organization pages and workspaces', () => {
    mockedUserState = {
        accent: 'blue',
        error: null,
        isLoading: false,
        organizations: [organizationMembership],
        radius: 'md',
        role: 'administrator',
        theme: 'system',
        user,
    };
    mockedOrganizationState = {
        applications: [application],
        error: null,
        invitations: [invitation],
        isLoading: false,
        organization: organizationDetails,
        people: [member],
    };
    mockedOrganizationActions = {
        canInviteMembers: true,
        canManageMembers: true,
        changeMemberRole: async () => undefined,
        deleteApplication: async () => undefined,
        inviteMember: async () => undefined,
        isChangingMemberRole: false,
        isDeletingApplication: false,
        isInviting: false,
    };
    mockedDatabaseResources = [
        {
            id: 'database-resource-1',
            name: 'app_inventory',
            kind: 'schema',
            status: 'available',
            database_name: 'organization_acme',
            row_estimate: 3,
            space_used: 2048,
            table_count: 1,
            application,
        },
        {
            id: 'database-resource-2',
            name: 'users',
            kind: 'shared_table',
            status: 'available',
            database_name: 'organization_acme',
            row_estimate: 2,
            space_used: 1024,
            table_count: 1,
            application: null,
        },
    ];
    mockedDatabaseTables = [
        {
            name: 'orders',
            schema_name: 'app_inventory',
            columns: [{ name: 'number', type: 'text' }],
            rows: [{ number: 'SO-1' }],
        },
    ];
    mockedStorageResources = [
        {
            id: 'storage-resource-1',
            name: 'inventory',
            kind: 'application_bucket',
            status: 'available',
            bucket_name: 'acme-inventory',
            storage_registry_name: 'local-s3',
            application,
        },
        {
            id: 'storage-resource-2',
            name: 'shared',
            kind: 'shared_bucket',
            status: 'available',
            bucket_name: 'acme-shared',
            storage_registry_name: 'local-s3',
            application: null,
        },
    ];

    it('shows sign-in for anonymous organization users', () => {
        mockedUserState = {
            ...mockedUserState,
            organizations: [],
            user: null,
        };

        const output = renderToStaticMarkup(
            createElement(
                MemoryRouter,
                { initialEntries: ['/organizations?next=/orgs/acme'] },
                createElement(Organizations)
            )
        );

        expect(output).toContain('sign-in /orgs/acme');

        mockedUserState = {
            ...mockedUserState,
            organizations: [organizationMembership],
            user,
        };
    });

    it('lists authenticated organization memberships and creation entrypoint', () => {
        const output = renderToStaticMarkup(
            createElement(MemoryRouter, { initialEntries: ['/organizations'] }, createElement(Organizations))
        );

        expect(output).toContain('Organizations');
        expect(output).toContain('Acme Ops');
        expect(output).toContain('Create organization');
    });

    it('lets users edit account preferences and navigate to their organizations from settings', () => {
        const accountOutput = renderToStaticMarkup(
            createElement(MemoryRouter, { initialEntries: ['/settings'] }, createElement(Settings))
        );
        const appearanceOutput = renderWithHash(createElement(Settings), '/settings', '#appearance');
        const organizationsOutput = renderWithHash(createElement(Settings), '/settings', '#organizations');

        expect(accountOutput).toContain('Sau User');
        expect(appearanceOutput).toContain('Theme');
        expect(organizationsOutput).toContain('Acme Ops');
    });

    it('renders the organization shell with applications, people, database, storage, and settings tabs', () => {
        const output = renderRoute(createElement(Organization), '/orgs/acme', '/orgs/:organization/*');

        expect(output).toContain('href="/orgs/acme"');
        expect(output).toContain('href="/orgs/acme/settings"');
        expect(output).toContain('Inventory');
    });

    it('renders people members, invitations, and role-management actions', () => {
        const membersOutput = renderToStaticMarkup(
            createElement(People, {
                organization: 'acme',
                people: [member],
                invitations: [invitation],
                isLoading: false,
                error: null,
            })
        );
        const invitationsOutput = renderWithHash(
            createElement(People, {
                organization: 'acme',
                people: [member],
                invitations: [invitation],
                isLoading: false,
                error: null,
            }),
            '/orgs/acme/people',
            '#invitations'
        );

        expect(membersOutput).toContain('Maintainer User');
        expect(invitationsOutput).toContain('new@example.com');
    });

    it('renders organization settings details, permissions, resources, and app creation', () => {
        const element = createElement(OrganizationSettings, {
            organization: 'acme',
            organizationDetails,
            applications: [application],
            isLoading: false,
            error: null,
        });
        const detailsOutput = renderToStaticMarkup(createElement(MemoryRouter, null, element));
        const permissionsOutput = renderWithHash(element, '/orgs/acme/settings', '#permissions');
        const applicationsOutput = renderWithHash(element, '/orgs/acme/settings', '#applications');
        const databaseOutput = renderWithHash(element, '/orgs/acme/settings', '#database');
        const storageOutput = renderWithHash(element, '/orgs/acme/settings', '#storage');

        expect(detailsOutput).toContain('Acme Ops');
        expect(permissionsOutput).toContain('Permissions');
        expect(applicationsOutput).toContain('Create application');
        expect(databaseOutput).toContain('app_inventory');
        expect(storageOutput).toContain('acme-inventory');
    });

    it('lists database resources and previews schema table rows', () => {
        const rootOutput = renderRoute(
            createElement(OrganizationDatabase, {
                organization: 'acme',
                organizationDetails,
                isLoading: false,
            }),
            '/orgs/acme/database',
            '/orgs/:organization/database'
        );
        const tableOutput = renderRoute(
            createElement(OrganizationDatabase, {
                organization: 'acme',
                organizationDetails,
                isLoading: false,
            }),
            '/orgs/acme/database/schemas/app_inventory/tables/orders',
            '/orgs/:organization/database/:databaseResourceType/:databaseResource/tables/:databaseTable'
        );

        expect(rootOutput).toContain('app_inventory');
        expect(tableOutput).toContain('Back to schema');
        expect(tableOutput).toContain('SO-1');
    });

    it('lists storage resources and bucket details', () => {
        const rootOutput = renderRoute(
            createElement(OrganizationStorage, {
                organization: 'acme',
                organizationDetails,
                isLoading: false,
            }),
            '/orgs/acme/storage',
            '/orgs/:organization/storage'
        );
        const detailOutput = renderRoute(
            createElement(OrganizationStorage, {
                organization: 'acme',
                organizationDetails,
                isLoading: false,
            }),
            '/orgs/acme/storage/buckets/acme-inventory',
            '/orgs/:organization/storage/buckets/:bucket'
        );

        expect(rootOutput).toContain('acme-inventory');
        expect(detailOutput).toContain('Back to storage');
    });
});
