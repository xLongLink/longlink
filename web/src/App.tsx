import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';
import { DOC_PAGES } from '@/pages/docs/catalog';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import { Skeleton } from '@ui/skeleton';
import { Toaster } from '@ui/sonner';
import { Suspense, lazy } from 'react';
import { RouterProvider, createBrowserRouter, useParams } from 'react-router';
import DocsPageRoute from './pages/docs/DocsPageRoute';

const Auth = lazy(() => import('@/components/Auth').then((module) => ({ default: module.Auth })));
const Home = lazy(() => import('./pages/Home'));
const Playground = lazy(() => import('./pages/Playground'));
const View = lazy(() => import('./pages/View'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminApplications = lazy(() => import('./pages/admin/Applications'));
const AdminCompute = lazy(() => import('./pages/admin/Compute'));
const ComputeNamespaces = lazy(() => import('./pages/admin/ComputeNamespaces'));
const ComputePods = lazy(() => import('./pages/admin/ComputePods'));
const AdminDatabase = lazy(() => import('./pages/admin/Database'));
const DatabaseInstances = lazy(() => import('./pages/admin/DatabaseInstances'));
const DatabaseSchemas = lazy(() => import('./pages/admin/DatabaseSchemas'));
const AdminLocation = lazy(() => import('./pages/admin/Location'));
const AdminOperations = lazy(() => import('./pages/admin/Operations'));
const AdminOrganization = lazy(() => import('./pages/admin/Organization'));
const AdminStorage = lazy(() => import('./pages/admin/Storage'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Person = lazy(() => import('./pages/org/Person'));
const Organization = lazy(() => import('./pages/Organization'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Settings = lazy(() => import('./pages/Settings'));
const Layout = lazy(() => import('@/layout/Layout'));
const LegalLayout = lazy(() => import('@/layout/LegalLayout').then((module) => ({ default: module.LegalLayout })));

const routeFallback = <div className="min-h-screen" />;

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [
            {
                path: '/',
                element: (
                    <Suspense fallback={routeFallback}>
                        <View metadata="/metadata.json" />
                    </Suspense>
                ),
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
            path: 'playground',
            element: (
                <Suspense fallback={routeFallback}>
                    <Playground />
                </Suspense>
            ),
        },
        {
            path: 'impressum',
            element: (
                <Suspense fallback={routeFallback}>
                    <LegalLayout title="Impressum" content={impressumContent} metadata={impressumMetadata} />
                </Suspense>
            ),
        },
        {
            path: 'terms',
            element: (
                <Suspense fallback={routeFallback}>
                    <LegalLayout title="Terms" content={termsContent} metadata={termsMetadata} />
                </Suspense>
            ),
        },
        {
            path: 'privacy',
            element: (
                <Suspense fallback={routeFallback}>
                    <LegalLayout title="Privacy" content={privacyContent} metadata={privacyMetadata} />
                </Suspense>
            ),
        },
        {
            path: 'organizations',
            element: (
                <Suspense fallback={routeFallback}>
                    <Organizations />
                </Suspense>
            ),
        },
        {
            path: 'settings',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth>
                        <Suspense fallback={routeFallback}>
                            <Settings />
                        </Suspense>
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: 'admin',
            element: (
                <Suspense fallback={routeFallback}>
                    <Admin />
                </Suspense>
            ),
            children: [
                {
                    index: true,
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminUsers />
                        </Suspense>
                    ),
                },
                {
                    path: 'users',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminUsers />
                        </Suspense>
                    ),
                },
                {
                    path: 'applications',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminApplications />
                        </Suspense>
                    ),
                },
                {
                    path: 'organizations',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminOrganization />
                        </Suspense>
                    ),
                },
                {
                    path: 'locations',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminLocation />
                        </Suspense>
                    ),
                },
                {
                    path: 'database',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminDatabase />
                        </Suspense>
                    ),
                },
                {
                    path: 'database/:database',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <DatabaseInstances />
                        </Suspense>
                    ),
                },
                {
                    path: 'database/:database/databases/:databaseName',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <DatabaseSchemas />
                        </Suspense>
                    ),
                },
                {
                    path: 'storage',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminStorage />
                        </Suspense>
                    ),
                },
                {
                    path: 'compute',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminCompute />
                        </Suspense>
                    ),
                },
                {
                    path: 'compute/:compute',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <ComputeNamespaces />
                        </Suspense>
                    ),
                },
                {
                    path: 'compute/:compute/namespace/:namespace',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <ComputePods />
                        </Suspense>
                    ),
                },
                {
                    path: 'operations',
                    element: (
                        <Suspense fallback={routeFallback}>
                            <AdminOperations />
                        </Suspense>
                    ),
                },
            ],
        },
        {
            path: 'orgs/:organization',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth requiredRole="user">
                        <Suspense fallback={routeFallback}>
                            <Organization />
                        </Suspense>
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: 'orgs/:organization/applications',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth requiredRole="user">
                        <Suspense fallback={routeFallback}>
                            <Organization sectionName="applications" />
                        </Suspense>
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: 'orgs/:organization/people',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth requiredRole="user">
                        <Suspense fallback={routeFallback}>
                            <Organization sectionName="people" />
                        </Suspense>
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: 'orgs/:organization/people/:person',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth requiredRole="user">
                        <Suspense fallback={routeFallback}>
                            <Person />
                        </Suspense>
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: 'orgs/:organization/settings',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth requiredRole="user">
                        <Suspense fallback={routeFallback}>
                            <Organization sectionName="settings" />
                        </Suspense>
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: 'orgs/:organization/apps/:application/*',
            element: (
                <Suspense fallback={routeFallback}>
                    <Auth requiredRole="user">
                        <OrganizationApplicationView />
                    </Auth>
                </Suspense>
            ),
        },
        {
            path: '*',
            element: (
                <Suspense fallback={routeFallback}>
                    <NotFound />
                </Suspense>
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
    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const canViewLogs =
        platformRole === 'administrator' ||
        organizationMembership?.role === 'admin' ||
        organizationMembership?.role === 'owner';

    if (isLoading) {
        // Keep the app chrome visible while the org payload resolves.
        return (
            <Suspense fallback={routeFallback}>
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
            </Suspense>
        );
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organizationDetails || !organizationApplication) {
        return <NotFound />;
    }

    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <View
                applicationId={organizationApplication.id}
                applicationName={organizationApplication.name}
                canViewLogs={canViewLogs}
                applicationStatus={organizationApplication.status}
                metadata={`/api/applications/${organizationApplication.id}/proxy/metadata.json`}
            />
        </Suspense>
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
