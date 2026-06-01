import { Auth } from '@/components/Auth';
import { useOrg } from '@/hooks/use-org';
import { content as impressumContent, metadata as impressumMetadata } from '@/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/legal/terms';
import { apiUrl } from '@/lib/api';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter, useParams } from 'react-router';
import Admin from './pages/Admin';
import AdminCompute from './pages/admin/Compute';
import AdminDatabase from './pages/admin/Database';
import AdminLocation from './pages/admin/Location';
import AdminOrganization from './pages/admin/Organization';
import AdminStorage from './pages/admin/Storage';
import AdminUsers from './pages/admin/Users';
import DocsPage from './pages/Docs';
import Home from './pages/Home';
import { LegalPage } from './pages/LegalPage';
import NotFound from './pages/NotFound';
import Organization from './pages/Organization';
import Organizations from './pages/Organizations';
import Playground from './pages/Playground';
import Sample from './pages/Sample';
import Settings from './pages/Settings';
import Theme from './pages/Theme';
import View from './pages/View';

import { content as docsApiContent, metadata as docsApiMetadata } from '@/docs/api/index';
import { content as docsSelfHostedContent, metadata as docsSelfHostedMetadata } from '@/docs/api/self-hosted';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/docs/index';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/docs/sdk/building';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/docs/sdk/database';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/docs/sdk/environments';
import { content as docsSdkContent, metadata as docsSdkMetadata } from '@/docs/sdk/index';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/docs/sdk/testing';
import { content as docsXmlComponentsContent, metadata as docsXmlComponentsMetadata } from '@/docs/xml/components';
import { content as docsXmlContent, metadata as docsXmlMetadata } from '@/docs/xml/index';
import { content as docsXmlLayoutContent, metadata as docsXmlLayoutMetadata } from '@/docs/xml/layout';

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
        { path: 'docs', element: <DocsPage content={docsIndexContent} metadata={docsIndexMetadata} /> },
        { path: 'docs/api', element: <DocsPage content={docsApiContent} metadata={docsApiMetadata} /> },
        {
            path: 'docs/api/self-hosted',
            element: <DocsPage content={docsSelfHostedContent} metadata={docsSelfHostedMetadata} />,
        },
        { path: 'docs/sdk', element: <DocsPage content={docsSdkContent} metadata={docsSdkMetadata} /> },
        {
            path: 'docs/sdk/building',
            element: <DocsPage content={docsSdkBuildingContent} metadata={docsSdkBuildingMetadata} />,
        },
        {
            path: 'docs/sdk/database',
            element: <DocsPage content={docsSdkDatabaseContent} metadata={docsSdkDatabaseMetadata} />,
        },
        {
            path: 'docs/sdk/environments',
            element: <DocsPage content={docsSdkEnvironmentsContent} metadata={docsSdkEnvironmentsMetadata} />,
        },
        {
            path: 'docs/sdk/routes',
            element: <DocsPage content={docsSdkRoutesContent} metadata={docsSdkRoutesMetadata} />,
        },
        {
            path: 'docs/sdk/storage',
            element: <DocsPage content={docsSdkStorageContent} metadata={docsSdkStorageMetadata} />,
        },
        {
            path: 'docs/sdk/testing',
            element: <DocsPage content={docsSdkTestingContent} metadata={docsSdkTestingMetadata} />,
        },
        { path: 'docs/xml', element: <DocsPage content={docsXmlContent} metadata={docsXmlMetadata} /> },
        {
            path: 'docs/xml/components',
            element: <DocsPage content={docsXmlComponentsContent} metadata={docsXmlComponentsMetadata} />,
        },
        {
            path: 'docs/xml/layout',
            element: <DocsPage content={docsXmlLayoutContent} metadata={docsXmlLayoutMetadata} />,
        },
        { path: 'playground', element: <Playground /> },
        { path: 'theme', element: <Theme /> },
        { path: 'sample', element: <Sample /> },
        {
            path: 'impressum',
            element: <LegalPage title="Impressum" content={impressumContent} metadata={impressumMetadata} />,
        },
        { path: 'terms', element: <LegalPage title="Terms" content={termsContent} metadata={termsMetadata} /> },
        {
            path: 'privacy',
            element: <LegalPage title="Privacy" content={privacyContent} metadata={privacyMetadata} />,
        },
        {
            path: 'organizations',
            element: (
                <Auth>
                    <Organizations />
                </Auth>
            ),
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
                { path: 'organizations', element: <AdminOrganization /> },
                { path: 'locations', element: <AdminLocation /> },
                { path: 'database', element: <AdminDatabase /> },
                { path: 'storage', element: <AdminStorage /> },
                { path: 'compute', element: <AdminCompute /> },
            ],
        },
        {
            path: ':org',
            element: (
                <Auth>
                    <Organization />
                </Auth>
            ),
        },
        {
            path: ':org/applications',
            element: (
                <Auth>
                    <Organization sectionName="applications" />
                </Auth>
            ),
        },
        {
            path: ':org/people',
            element: (
                <Auth>
                    <Organization sectionName="people" />
                </Auth>
            ),
        },
        {
            path: ':org/settings',
            element: (
                <Auth>
                    <Organization sectionName="settings" />
                </Auth>
            ),
        },
        {
            path: ':org/:app/*',
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

/** Resolves an organization app name to its proxy-backed XML view. */
function OrgAppView() {
    const { org = '', app = '' } = useParams();
    const { org: organization, isLoading, error } = useOrg(org);
    const orgApp = organization?.apps.find((item) => item.name === app);

    // Keep the app route loading until the org payload resolves.
    if (isLoading) {
        return <div>Loading...</div>;
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
