import { Auth } from '@/components/Auth';
import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';
import DocsLayout from '@/layout/DocsLayout';
import Layout from '@/layout/Layout';
import { DOC_PAGES } from '@/pages/docs/catalog';
import { LegalLayout } from '@/layout/LegalLayout';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import { Skeleton } from '@ui/skeleton';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter, useParams } from 'react-router';
import Admin from './pages/Admin';
import AdminApplications from './pages/admin/Applications';
import AdminCompute from './pages/admin/Compute';
import ComputeNamespaces from './pages/admin/ComputeNamespaces';
import ComputePods from './pages/admin/ComputePods';
import AdminDatabase from './pages/admin/Database';
import DatabaseDatabases from './pages/admin/DatabaseDatabases';
import DatabaseSchemas from './pages/admin/DatabaseSchemas';
import AdminLocation from './pages/admin/Location';
import AdminOperations from './pages/admin/Operations';
import AdminOrganization from './pages/admin/Organization';
import AdminStorage from './pages/admin/Storage';
import AdminUsers from './pages/admin/Users';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Organization from './pages/Organization';
import Organizations from './pages/Organizations';
import Person from './pages/org/Person';
import Playground from './pages/Playground';
import Settings from './pages/Settings';
import View from './pages/View';

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [{ path: '/', element: <View metadata="/metadata.json" /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        ...DOC_PAGES.map(({ path, content, metadata }) => ({
            path: path.replace(/^\//, ''),
            element: <DocsLayout content={content} metadata={metadata} />,
        })),
        { path: 'playground', element: <Playground /> },
        {
            path: 'impressum',
            element: <LegalLayout title="Impressum" content={impressumContent} metadata={impressumMetadata} />,
        },
        { path: 'terms', element: <LegalLayout title="Terms" content={termsContent} metadata={termsMetadata} /> },
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
                <Auth requiredRole="user">
                    <Settings />
                </Auth>
            ),
        },
        {
            path: 'admin',
            element: <Admin />,
            children: [
                { index: true, element: <AdminUsers /> },
                { path: 'users', element: <AdminUsers /> },
                { path: 'applications', element: <AdminApplications /> },
                { path: 'organizations', element: <AdminOrganization /> },
                { path: 'locations', element: <AdminLocation /> },
                { path: 'database', element: <AdminDatabase /> },
                { path: 'database/:database', element: <DatabaseDatabases /> },
                { path: 'database/:database/database/:dbname', element: <DatabaseSchemas /> },
                { path: 'storage', element: <AdminStorage /> },
                { path: 'compute', element: <AdminCompute /> },
                { path: 'compute/:compute', element: <ComputeNamespaces /> },
                { path: 'compute/:compute/namespace/:namespace', element: <ComputePods /> },
                { path: 'operations', element: <AdminOperations /> },
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
            path: 'orgs/:organization/people/:person',
            element: (
                <Auth requiredRole="user">
                    <Person />
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
            element: (
                <Auth requiredRole="user">
                    <NotFound />
                </Auth>
            ),
        },
    ];
}

/** Resolves an organization application slug to its proxy-backed XML view. */
function OrganizationApplicationView() {
    const { organization = '', application = '' } = useParams();
    const { organization: organizationDetails, isLoading, error } = useOrganization(organization);
    const { role: platformRole, organizations: userOrganizations } = useUser();
    const organizationApplication = organizationDetails?.applications.find((item) => item.slug === application);
    const organizationMembership = userOrganizations.find((item) => item.name === organization);
    const canViewLogs =
        platformRole === 'administrator' || organizationMembership?.role === 'admin' || organizationMembership?.role === 'owner';

    if (isLoading) {
        // Keep the app chrome visible while the org payload resolves.
        return (
            <Layout brandOnly>
                <section className="mx-auto w-full max-w-[1000px] space-y-6 px-6 py-10">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-[28rem] max-w-full" />
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </section>
            </Layout>
        );
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !organizationApplication) {
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

const router = createBrowserRouter(getRoutes());

/**
 * Renders the app shell, router, and global toaster.
 */
export default function App() {
    return (
        <>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
        </>
    );
}
