import { Auth } from '@/components/Auth';
import { apiUrl } from '@/lib/api';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import impressumMarkdown from '../legal/impressum.md?raw';
import privacyMarkdown from '../legal/privacy.md?raw';
import termsMarkdown from '../legal/terms.md?raw';
import { LegalPage } from './pages/LegalPage';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Organization from './pages/Organization';
import Organizations from './pages/Organizations';
import Playground from './pages/Playground';
import Sample from './pages/Sample';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import AdminOrganization from './pages/admin/Organization';
import AdminUsers from './pages/admin/Users';
import AdminCompute from './pages/admin/Compute';
import AdminDatabase from './pages/admin/Database';
import AdminStorage from './pages/admin/Storage';
import DocsPage from './pages/Docs';
import Theme from './pages/Theme';
import View from './pages/View';

import docsApiMarkdown from '../docs/api/index.md?raw';
import docsSelfHostedMarkdown from '../docs/api/self-hosted.md?raw';
import docsIndexMarkdown from '../docs/index.md?raw';
import docsSdkBuildingMarkdown from '../docs/sdk/building.md?raw';
import docsSdkDatabaseMarkdown from '../docs/sdk/database.md?raw';
import docsSdkEnvironmentsMarkdown from '../docs/sdk/environments.md?raw';
import docsSdkMarkdown from '../docs/sdk/index.md?raw';
import docsSdkRoutesMarkdown from '../docs/sdk/routes.md?raw';
import docsSdkStorageMarkdown from '../docs/sdk/storage.md?raw';
import docsSdkTestingMarkdown from '../docs/sdk/testing.md?raw';
import docsXmlComponentsMarkdown from '../docs/xml/components.md?raw';
import docsXmlLayoutMarkdown from '../docs/xml/layout.md?raw';
import docsXmlMarkdown from '../docs/xml/index.md?raw';

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [{ path: '/', element: <View metadata="/metadata.json" baseurl="" /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        { path: 'docs', element: <DocsPage content={docsIndexMarkdown} /> },
        { path: 'docs/api', element: <DocsPage content={docsApiMarkdown} /> },
        { path: 'docs/api/self-hosted', element: <DocsPage content={docsSelfHostedMarkdown} /> },
        { path: 'docs/sdk', element: <DocsPage content={docsSdkMarkdown} /> },
        { path: 'docs/sdk/building', element: <DocsPage content={docsSdkBuildingMarkdown} /> },
        { path: 'docs/sdk/database', element: <DocsPage content={docsSdkDatabaseMarkdown} /> },
        { path: 'docs/sdk/environments', element: <DocsPage content={docsSdkEnvironmentsMarkdown} /> },
        { path: 'docs/sdk/routes', element: <DocsPage content={docsSdkRoutesMarkdown} /> },
        { path: 'docs/sdk/storage', element: <DocsPage content={docsSdkStorageMarkdown} /> },
        { path: 'docs/sdk/testing', element: <DocsPage content={docsSdkTestingMarkdown} /> },
        { path: 'docs/xml', element: <DocsPage content={docsXmlMarkdown} /> },
        { path: 'docs/xml/components', element: <DocsPage content={docsXmlComponentsMarkdown} /> },
        { path: 'docs/xml/layout', element: <DocsPage content={docsXmlLayoutMarkdown} /> },
        { path: 'playground', element: <Playground /> },
        { path: 'theme', element: <Theme /> },
        { path: 'sample', element: <Sample /> },
        { path: 'impressum', element: <LegalPage title="Impressum" content={impressumMarkdown} /> },
        { path: 'terms', element: <LegalPage title="Terms" content={termsMarkdown} /> },
        { path: 'privacy', element: <LegalPage title="Privacy" content={privacyMarkdown} /> },
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
                { path: 'organization', element: <AdminOrganization /> },
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
                    <View metadata={apiUrl('/api/:org/:app/metadata.json')} baseurl={apiUrl('/api/apps/:app')} />
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
