import { Auth } from '@/components/Auth';
import { useOrg } from '@/hooks/use-org';
import { apiUrl } from '@/lib/api';
import Layout from '@/layout/Layout';
import { Toaster } from '@ui/sonner';
import { Skeleton } from '@ui/skeleton';
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
import DocsLayout from '@/layout/DocsLayout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Organization from './pages/Organization';
import Organizations from './pages/Organizations';
import Playground from './pages/Playground';
import Settings from './pages/Settings';
import View from './pages/View';

import { content as docsApiContent, metadata as docsApiMetadata } from '@/pages/docs/api/index';
import { content as docsSelfHostedContent, metadata as docsSelfHostedMetadata } from '@/pages/docs/api/self-hosted';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/pages/docs/index';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/pages/docs/sdk/building';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/pages/docs/sdk/database';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/pages/docs/sdk/environments';
import { content as docsSdkContent, metadata as docsSdkMetadata } from '@/pages/docs/sdk/index';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/pages/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/pages/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/pages/docs/sdk/testing';
import {
    content as docsXmlComponentsContent,
    metadata as docsXmlComponentsMetadata,
} from '@/pages/docs/xml/components';
import { content as docsXmlContent, metadata as docsXmlMetadata } from '@/pages/docs/xml/index';
import { content as docsXmlLayoutContent, metadata as docsXmlLayoutMetadata } from '@/pages/docs/xml/layout';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import { LegalLayout } from '@/layout/LegalLayout';

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
        { path: 'docs', element: <DocsLayout content={docsIndexContent} metadata={docsIndexMetadata} /> },
        { path: 'docs/api', element: <DocsLayout content={docsApiContent} metadata={docsApiMetadata} /> },
        {
            path: 'docs/api/self-hosted',
            element: <DocsLayout content={docsSelfHostedContent} metadata={docsSelfHostedMetadata} />,
        },
        { path: 'docs/sdk', element: <DocsLayout content={docsSdkContent} metadata={docsSdkMetadata} /> },
        {
            path: 'docs/sdk/building',
            element: <DocsLayout content={docsSdkBuildingContent} metadata={docsSdkBuildingMetadata} />,
        },
        {
            path: 'docs/sdk/database',
            element: <DocsLayout content={docsSdkDatabaseContent} metadata={docsSdkDatabaseMetadata} />,
        },
        {
            path: 'docs/sdk/environments',
            element: <DocsLayout content={docsSdkEnvironmentsContent} metadata={docsSdkEnvironmentsMetadata} />,
        },
        {
            path: 'docs/sdk/routes',
            element: <DocsLayout content={docsSdkRoutesContent} metadata={docsSdkRoutesMetadata} />,
        },
        {
            path: 'docs/sdk/storage',
            element: <DocsLayout content={docsSdkStorageContent} metadata={docsSdkStorageMetadata} />,
        },
        {
            path: 'docs/sdk/testing',
            element: <DocsLayout content={docsSdkTestingContent} metadata={docsSdkTestingMetadata} />,
        },
        { path: 'docs/xml', element: <DocsLayout content={docsXmlContent} metadata={docsXmlMetadata} /> },
        {
            path: 'docs/xml/components',
            element: <DocsLayout content={docsXmlComponentsContent} metadata={docsXmlComponentsMetadata} />,
        },
        {
            path: 'docs/xml/layout',
            element: <DocsLayout content={docsXmlLayoutContent} metadata={docsXmlLayoutMetadata} />,
        },
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
                <Auth>
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
                { path: 'database/:name', element: <DatabaseDatabases /> },
                { path: 'database/:name/database/:dbname', element: <DatabaseSchemas /> },
                { path: 'storage', element: <AdminStorage /> },
                { path: 'compute', element: <AdminCompute /> },
                { path: 'compute/:id', element: <ComputeNamespaces /> },
                { path: 'compute/:id/namespace/:namespace', element: <ComputePods /> },
                { path: 'operations', element: <AdminOperations /> },
            ],
        },
        {
            path: 'orgs/:org',
            element: (
                <Auth>
                    <Organization />
                </Auth>
            ),
        },
        {
            path: 'orgs/:org/applications',
            element: (
                <Auth>
                    <Organization sectionName="applications" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:org/people',
            element: (
                <Auth>
                    <Organization sectionName="people" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:org/settings',
            element: (
                <Auth>
                    <Organization sectionName="settings" />
                </Auth>
            ),
        },
        {
            path: 'orgs/:org/apps/:app/*',
            element: (
                <Auth>
                    <OrgAppView />
                </Auth>
            ),
        },
        {
            path: '*',
            element: (
                <Auth>
                    <NotFound />
                </Auth>
            ),
        },
    ];
}

/** Resolves an organization app id to its proxy-backed XML view. */
function OrgAppView() {
    const { org = '', app = '' } = useParams();
    const { org: organization, isLoading, error } = useOrg(org);
    const orgApp = organization?.apps.find((item) => item.id === app);

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
    if (error?.status === 404 || !organization || !orgApp) {
        return <NotFound />;
    }

    return <View metadata={apiUrl(`/api/apps/${orgApp.id}/proxy/metadata.json`)} />;
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
