import { Auth } from '@/components/Auth';
import { useOrganization } from '@/hooks/use-organization';
import { useSdkUser } from '@/hooks/use-sdk-user';
import { useUser } from '@/hooks/use-user';
import { LegalLayout } from '@/layout/LegalLayout';
import { canAccessApplication, canViewApplicationLogs } from '@/lib/roles';
import Admin from '@/pages/Admin';
import AdminApplications from '@/pages/admin/Applications';
import AdminCompute from '@/pages/admin/Compute';
import ComputeNamespaces from '@/pages/admin/ComputeNamespaces';
import ComputePods from '@/pages/admin/ComputePods';
import AdminDatabase from '@/pages/admin/Database';
import DatabaseInstances from '@/pages/admin/DatabaseInstances';
import DatabaseSchemas from '@/pages/admin/DatabaseSchemas';
import AdminLocation from '@/pages/admin/Location';
import AdminOperations from '@/pages/admin/Operations';
import AdminOrganizations from '@/pages/admin/Organizations';
import AdminStorage from '@/pages/admin/Storage';
import StorageBuckets from '@/pages/admin/StorageBuckets';
import StorageObjects from '@/pages/admin/StorageObjects';
import AdminUsers from '@/pages/admin/Users';
import { DOC_PAGES } from '@/pages/docs/catalog';
import DocsPageRoute from '@/pages/docs/DocsPageRoute';
import Home from '@/pages/Home';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import NotFound from '@/pages/NotFound';
import Organization from '@/pages/Organization';
import Organizations from '@/pages/Organizations';
import Pricing from '@/pages/Pricing';
import Settings from '@/pages/Settings';
import View from '@/pages/View';
import { createContext as createXmlContext } from '@/xml';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter, useParams } from 'react-router';

type AppRouter = ReturnType<typeof createBrowserRouter>;

let appRouter: AppRouter | null = null;

/** Builds the route tree for the current bundle mode. */
export function getRoutes(mode = import.meta.env.MODE) {
    // SDK bundle serves the app runtime without control-plane routes.
    if (mode === 'sdk') {
        return [
            {
                path: '*',
                element: <SdkApplicationView />,
            },
        ];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        ...DOC_PAGES.map((page) => ({
            path: page.path.replace(/^\//, ''),
            element: <DocsPageRoute page={page} />,
        })),
        {
            path: 'impressum',
            element: <LegalLayout title="Impressum" content={impressumContent} metadata={impressumMetadata} />,
        },
        {
            path: 'pricing',
            element: <Pricing />,
        },
        {
            path: 'terms',
            element: <LegalLayout title="Terms" content={termsContent} metadata={termsMetadata} />,
        },
        {
            path: 'privacy',
            element: <LegalLayout title="Privacy" content={privacyContent} metadata={privacyMetadata} />,
        },
        {
            path: 'organizations',
            element: <Organizations />,
        },
        {
            path: 'settings',
            element: (
                <Auth>
                    <Settings />
                </Auth>
            ),
        },
        {
            path: 'admin',
            element: <Admin />,
            children: [
                {
                    index: true,
                    element: <AdminUsers />,
                },
                {
                    path: 'users',
                    element: <AdminUsers />,
                },
                {
                    path: 'applications',
                    element: <AdminApplications />,
                },
                {
                    path: 'organizations',
                    element: <AdminOrganizations />,
                },
                {
                    path: 'locations',
                    element: <AdminLocation />,
                },
                {
                    path: 'database',
                    element: <AdminDatabase />,
                },
                {
                    path: 'database/:database',
                    element: <DatabaseInstances />,
                },
                {
                    path: 'database/:database/databases/:databaseName',
                    element: <DatabaseSchemas />,
                },
                {
                    path: 'storage',
                    element: <AdminStorage />,
                },
                {
                    path: 'storage/:storage',
                    element: <StorageBuckets />,
                },
                {
                    path: 'storage/:storage/buckets/:bucket',
                    element: <StorageObjects />,
                },
                {
                    path: 'compute',
                    element: <AdminCompute />,
                },
                {
                    path: 'compute/:compute',
                    element: <ComputeNamespaces />,
                },
                {
                    path: 'compute/:compute/namespace/:namespace',
                    element: <ComputePods />,
                },
                {
                    path: 'operations',
                    element: <AdminOperations />,
                },
            ],
        },
        {
            path: 'orgs/:organization',
            element: (
                <Auth requiredRole="user">
                    <Organization />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/applications',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="applications" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/people',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="people" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/database',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="database" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/database/:databaseResourceType/:databaseResource',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="database" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/database/:databaseResourceType/:databaseResource/tables/:databaseTable',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="database" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/storage',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="storage" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/storage/buckets/:bucket',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="storage" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/settings',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="settings" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/apps/:application/*',
            element: (
                <Auth requiredRole="user">
                    <OrganizationApplicationView />
                </Auth>
            ),
        },
        {
            path: '*',
            element: <NotFound />,
        },
    ];
}

/** Renders the SDK application with the selected local user in XML runtime scope. */
function SdkApplicationView() {
    const { user } = useSdkUser();
    const runtimeContext = createXmlContext();

    runtimeContext.user = user;

    return <View metadata="/metadata.json" runtimeContext={runtimeContext} runtimeKey={`sdk-user-${user.id}`} />;
}

/** Resolves an organization application slug to its proxy-backed XML view. */
function OrganizationApplicationView() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, isLoading, error } = useOrganization(organization);
    const { role: platformRole, organizations: userOrganizations } = useUser();
    const organizationApplication = organizationDetails?.applications.find((item) => item.slug === application);
    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const organizationRole = organizationMembership?.role ?? null;
    const applicationRole = organizationApplication?.role ?? null;
    const hasApplicationAccess = canAccessApplication(organizationRole, applicationRole);
    const canViewLogs = platformRole === 'administrator' || canViewApplicationLogs(organizationRole, applicationRole);

    if (isLoading) {
        return <View applicationStatus="loading" metadata="" />;
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !organizationApplication || !hasApplicationAccess) {
        return <NotFound />;
    }

    return (
        <View
            applicationId={organizationApplication.id}
            applicationName={organizationApplication.name}
            canViewLogs={canViewLogs}
            applicationStatus={organizationApplication.status}
            metadata={`/api/applications/${organizationApplication.id}/proxy/metadata.json`}
        />
    );
}

/** Returns the browser router, creating it lazily in the browser runtime. */
function getRouter(): AppRouter {
    appRouter ??= createBrowserRouter(getRoutes());

    return appRouter;
}

/** Renders the app shell, router, and global toaster. */
export default function App() {
    return (
        <>
            <RouterProvider router={getRouter()} />
            <Toaster position="bottom-right" />
        </>
    );
}
