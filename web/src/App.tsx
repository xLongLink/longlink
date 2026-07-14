import { Auth } from '@/components/Auth';
import { Toaster } from '@/components/ui/sonner';
import { useOrganization } from '@/hooks/use-organization';
import { useUserProfile } from '@/hooks/use-user';
import ArticleLayout from '@/layout/ArticleLayout';
import { canAccessApplication } from '@/lib/roles';
import Admin from '@/pages/Admin';
import AdminApplications from '@/pages/admin/Applications';
import AdminCompute from '@/pages/admin/Compute';
import ComputeNamespaces from '@/pages/admin/ComputeNamespaces';
import ComputePods from '@/pages/admin/ComputePods';
import AdminDatabase from '@/pages/admin/Database';
import AdminLocation from '@/pages/admin/Location';
import AdminOperations from '@/pages/admin/Operations';
import AdminOrganizations from '@/pages/admin/Organizations';
import AdminStorage from '@/pages/admin/Storage';
import AdminUsers from '@/pages/admin/Users';
import { DOC_GROUPS, DOC_PAGES } from '@/pages/docs/catalog';
import Home from '@/pages/Home';
import { LEGAL_GROUPS, LEGAL_PAGES } from '@/pages/legal/catalog';
import NotFound from '@/pages/NotFound';
import Organization from '@/pages/Organization';
import Organizations from '@/pages/Organizations';
import Pricing from '@/pages/Pricing';
import Settings from '@/pages/Settings';
import View from '@/pages/View';
import type { RouteObject } from 'react-router';
import { RouterProvider, createBrowserRouter, useParams } from 'react-router';

type AppRouter = ReturnType<typeof createBrowserRouter>;

let appRouter: AppRouter | null = null;

/** Builds admin routes with a persistent shell around tab-specific pages. */
function adminRoutes() {
    return {
        element: <Admin />,
        children: [
            { path: 'admin/users', element: <AdminUsers /> },
            { path: 'admin/applications', element: <AdminApplications /> },
            { path: 'admin/organizations', element: <AdminOrganizations /> },
            { path: 'admin/locations', element: <AdminLocation /> },
            { path: 'admin/database', element: <AdminDatabase /> },
            { path: 'admin/storage', element: <AdminStorage /> },
            { path: 'admin/compute', element: <AdminCompute /> },
            { path: 'admin/compute/:compute', element: <ComputeNamespaces /> },
            { path: 'admin/compute/:compute/namespace/:namespace', element: <ComputePods /> },
            { path: 'admin/operations', element: <AdminOperations /> },
        ],
    };
}

/** Builds the route tree for the current bundle mode. */
export function getRoutes(mode = import.meta.env.MODE): RouteObject[] {
    // SDK bundle serves the app runtime without platform routes.
    if (mode === 'sdk') {
        return [
            {
                path: '*',
                element: <SdkApplicationView />,
            },
        ];
    }

    // Default bundle serves the full app with platform routes.
    return [
        { path: '/', element: <Home /> },
        ...DOC_PAGES.map((page) => ({
            path: page.path.replace(/^\//, ''),
            element: <ArticleLayout page={page} navigationGroups={DOC_GROUPS} />,
        })),
        ...LEGAL_PAGES.map((page) => ({
            path: page.path.replace(/^\//, ''),
            element: <ArticleLayout page={page} navigationGroups={LEGAL_GROUPS} />,
        })),
        {
            path: 'pricing',
            element: <Pricing />,
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
        adminRoutes(),
        {
            path: 'orgs/:organization',
            element: (
                <Auth requiredRole="user">
                    <Organization />
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
            path: 'orgs/:organization/storage',
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
                    <Organization sectionName="settings" settingsSection="organization" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/settings/applications',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="settings" settingsSection="applications" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/settings/applications/:settingsApplication',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="settings" settingsSection="applications" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/settings/people',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="settings" settingsSection="people" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/settings/database',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="settings" settingsSection="database" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:organization/settings/storage',
            element: (
                <Auth requiredRole="user">
                    <Organization sectionName="settings" settingsSection="storage" />
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

/** Renders the SDK application without platform routes. */
function SdkApplicationView() {
    return <View pages="/pages.json" />;
}

/** Resolves an organization application slug to its proxy-backed XML view. */
function OrganizationApplicationView() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, isLoading, error } = useOrganization(organization);
    const { organizations: userOrganizations, language } = useUserProfile();
    const organizationApplication = organizationDetails?.applications.find((item) => item.slug === application);
    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const organizationRole = organizationMembership?.role ?? null;
    const applicationRole = organizationApplication?.role ?? null;
    const hasApplicationAccess = canAccessApplication(organizationRole, applicationRole);

    // Show the shell while organization/application access is still resolving.
    if (isLoading) {
        return <View applicationStatus="loading" pages="" />;
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !organizationApplication || !hasApplicationAccess) {
        return <NotFound />;
    }

    return (
        <View
            applicationStatus={organizationApplication.status}
            locale={language}
            pages={`/api/applications/${organizationApplication.id}/proxy/pages.json`}
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
